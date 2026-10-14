"""Cloud credential store and session factory for CloudSentinel.

One place to save AWS / Azure credentials and to get ready-to-use SDK
sessions. Collectors and other modules never touch raw keys; they ask the
manager for a session:

    from app.core.cloud_sessions import CloudSessionManager

    mgr = CloudSessionManager()
    s3 = mgr.aws_session("prod-readonly").client("s3")
    cred = mgr.azure_credential("prod-readonly")   # pass to Azure SDK clients

Where keys are stored
---------------------
A JSON file OUTSIDE the repository (default ~/.cloudsentinel/credentials.json,
override with CLOUDSENTINEL_CREDENTIALS_FILE). The file is written with
owner-only permissions (0600; on Windows rely on your user profile ACLs).

Optional encryption at rest: set CLOUDSENTINEL_MASTER_KEY to a Fernet key
(`python -m app.core.cloud_sessions generate-key`) and install `cryptography`.
Keep that key in your environment or a secrets manager, NOT next to the file.

Prefer short-lived credentials (AWS IAM Identity Center / assumed roles,
Azure `az login`) when you can. If no stored profile exists, the manager falls
back to the standard credential chains of boto3 and azure-identity.

CLI (run from the backend/ folder):

    python -m app.core.cloud_sessions add-aws --profile default
    python -m app.core.cloud_sessions add-azure --profile default
    python -m app.core.cloud_sessions list
    python -m app.core.cloud_sessions verify aws --profile default
    python -m app.core.cloud_sessions verify azure --profile default
    python -m app.core.cloud_sessions delete aws --profile default
    python -m app.core.cloud_sessions generate-key
"""

from __future__ import annotations

import argparse
import getpass
import json
import os
import sys
import tempfile
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any, Literal

Provider = Literal["aws", "azure"]

DEFAULT_CREDENTIALS_FILE = Path.home() / ".cloudsentinel" / "credentials.json"
ENV_CREDENTIALS_FILE = "CLOUDSENTINEL_CREDENTIALS_FILE"
ENV_MASTER_KEY = "CLOUDSENTINEL_MASTER_KEY"

AZURE_MANAGEMENT_SCOPE = "https://management.azure.com/.default"
AZURE_GRAPH_SCOPE = "https://graph.microsoft.com/.default"


class CredentialError(Exception):
    """Raised for missing, unreadable, or invalid credentials."""


# --------------------------------------------------------------------------
# Credential models (secrets are excluded from repr so they never hit logs)
# --------------------------------------------------------------------------
@dataclass(frozen=True)
class AwsCredentials:
    access_key_id: str
    secret_access_key: str = field(repr=False)
    session_token: str | None = field(default=None, repr=False)
    region: str = "us-east-1"


@dataclass(frozen=True)
class AzureCredentials:
    tenant_id: str
    client_id: str
    client_secret: str = field(repr=False)
    subscription_id: str | None = None


def mask(value: str | None, keep: int = 4) -> str:
    """Mask a secret-ish string for display, e.g. AKIA************WXYZ."""
    if not value:
        return "-"
    if len(value) <= keep * 2:
        return "*" * len(value)
    return value[:keep] + "*" * (len(value) - keep * 2) + value[-keep:]


# --------------------------------------------------------------------------
# Credential store (file persistence)
# --------------------------------------------------------------------------
class CredentialStore:
    """Reads and writes named credential profiles for AWS and Azure."""

    def __init__(self, path: str | os.PathLike[str] | None = None) -> None:
        chosen = path or os.environ.get(ENV_CREDENTIALS_FILE) or DEFAULT_CREDENTIALS_FILE
        self.path = Path(chosen).expanduser()

    def __repr__(self) -> str:  # never include contents
        return f"CredentialStore(path={str(self.path)!r})"

    # ---- low-level file handling ----------------------------------------
    @staticmethod
    def _fernet() -> Any | None:
        key = os.environ.get(ENV_MASTER_KEY)
        if not key:
            return None
        try:
            from cryptography.fernet import Fernet
        except ImportError as exc:
            raise CredentialError(
                f"{ENV_MASTER_KEY} is set but 'cryptography' is not installed "
                "(pip install cryptography)."
            ) from exc
        try:
            return Fernet(key.encode())
        except ValueError as exc:
            raise CredentialError(f"{ENV_MASTER_KEY} is not a valid Fernet key.") from exc

    def _read(self) -> dict[str, dict[str, dict[str, Any]]]:
        empty: dict[str, dict[str, dict[str, Any]]] = {"aws": {}, "azure": {}}
        if not self.path.exists():
            return empty

        raw = self.path.read_bytes()
        if not raw.strip():
            return empty

        if raw.lstrip().startswith(b"{"):  # plaintext JSON
            text = raw
        else:  # encrypted
            fernet = self._fernet()
            if fernet is None:
                raise CredentialError(
                    f"{self.path} is encrypted but {ENV_MASTER_KEY} is not set."
                )
            try:
                text = fernet.decrypt(raw)
            except Exception as exc:  # InvalidToken
                raise CredentialError(
                    "Could not decrypt the credentials file (wrong master key?)."
                ) from exc

        try:
            data = json.loads(text)
        except json.JSONDecodeError as exc:
            raise CredentialError(f"{self.path} is not valid JSON.") from exc

        data.setdefault("aws", {})
        data.setdefault("azure", {})
        return data

    def _write(self, data: dict[str, Any]) -> None:
        payload = json.dumps(data, indent=2).encode("utf-8")
        fernet = self._fernet()
        if fernet is not None:
            payload = fernet.encrypt(payload)

        self.path.parent.mkdir(parents=True, exist_ok=True)
        try:
            os.chmod(self.path.parent, 0o700)
        except OSError:
            pass

        # Atomic write: temp file (created 0600) then rename over the target.
        fd, tmp_name = tempfile.mkstemp(dir=self.path.parent, prefix=".cred-")
        try:
            with os.fdopen(fd, "wb") as fh:
                fh.write(payload)
            try:
                os.chmod(tmp_name, 0o600)
            except OSError:
                pass
            os.replace(tmp_name, self.path)
        except BaseException:
            try:
                os.unlink(tmp_name)
            except OSError:
                pass
            raise

    # ---- AWS -------------------------------------------------------------
    def save_aws(self, profile: str, creds: AwsCredentials) -> None:
        data = self._read()
        data["aws"][profile] = asdict(creds)
        self._write(data)

    def get_aws(self, profile: str) -> AwsCredentials | None:
        entry = self._read()["aws"].get(profile)
        return AwsCredentials(**entry) if entry else None

    # ---- Azure -----------------------------------------------------------
    def save_azure(self, profile: str, creds: AzureCredentials) -> None:
        data = self._read()
        data["azure"][profile] = asdict(creds)
        self._write(data)

    def get_azure(self, profile: str) -> AzureCredentials | None:
        entry = self._read()["azure"].get(profile)
        return AzureCredentials(**entry) if entry else None

    # ---- common ----------------------------------------------------------
    def list_profiles(self, provider: Provider) -> list[str]:
        return sorted(self._read()[provider].keys())

    def delete(self, provider: Provider, profile: str) -> bool:
        data = self._read()
        if profile not in data[provider]:
            return False
        del data[provider][profile]
        self._write(data)
        return True


# --------------------------------------------------------------------------
# Session manager (what other modules import)
# --------------------------------------------------------------------------
class CloudSessionManager:
    """Single interface to store keys and obtain AWS / Azure sessions."""

    def __init__(self, store: CredentialStore | None = None) -> None:
        self.store = store or CredentialStore()

    # ---- saving keys -----------------------------------------------------
    def add_aws_profile(
        self,
        profile: str,
        access_key_id: str,
        secret_access_key: str,
        region: str = "us-east-1",
        session_token: str | None = None,
    ) -> None:
        if not access_key_id or not secret_access_key:
            raise CredentialError("AWS access key id and secret are required.")
        self.store.save_aws(
            profile,
            AwsCredentials(
                access_key_id=access_key_id.strip(),
                secret_access_key=secret_access_key.strip(),
                session_token=(session_token or "").strip() or None,
                region=region,
            ),
        )

    def add_azure_profile(
        self,
        profile: str,
        tenant_id: str,
        client_id: str,
        client_secret: str,
        subscription_id: str | None = None,
    ) -> None:
        if not (tenant_id and client_id and client_secret):
            raise CredentialError("Azure tenant id, client id and client secret are required.")
        self.store.save_azure(
            profile,
            AzureCredentials(
                tenant_id=tenant_id.strip(),
                client_id=client_id.strip(),
                client_secret=client_secret.strip(),
                subscription_id=(subscription_id or "").strip() or None,
            ),
        )

    # ---- sessions --------------------------------------------------------
    def aws_session(self, profile: str | None = "default", region: str | None = None):
        """Return a boto3.Session.

        Uses the stored profile if it exists, otherwise falls back to the
        standard boto3 chain (env vars, ~/.aws profile, SSO, instance role).
        """
        import boto3  # lazy import: module works without boto3 installed

        creds = self.store.get_aws(profile) if profile else None
        if creds:
            return boto3.Session(
                aws_access_key_id=creds.access_key_id,
                aws_secret_access_key=creds.secret_access_key,
                aws_session_token=creds.session_token,
                region_name=region or creds.region,
            )
        # "default" with nothing stored -> plain default chain
        return boto3.Session(
            profile_name=None if profile in (None, "default") else profile,
            region_name=region,
        )

    def azure_credential(self, profile: str | None = "default"):
        """Return an azure-identity credential object.

        Uses the stored service principal if it exists, otherwise
        DefaultAzureCredential (env vars, `az login`, managed identity).
        """
        creds = self.store.get_azure(profile) if profile else None
        if creds:
            from azure.identity import ClientSecretCredential

            return ClientSecretCredential(
                tenant_id=creds.tenant_id,
                client_id=creds.client_id,
                client_secret=creds.client_secret,
            )
        from azure.identity import DefaultAzureCredential

        return DefaultAzureCredential()

    def azure_subscription_id(self, profile: str | None = "default") -> str | None:
        creds = self.store.get_azure(profile) if profile else None
        return creds.subscription_id if creds else os.environ.get("AZURE_SUBSCRIPTION_ID")

    # ---- verification (never returns secrets or tokens) -------------------
    def verify_aws(self, profile: str | None = "default") -> dict[str, str]:
        """Call STS GetCallerIdentity to confirm the keys work."""
        identity = self.aws_session(profile).client("sts").get_caller_identity()
        return {"account": identity["Account"], "arn": identity["Arn"]}

    def verify_azure(
        self, profile: str | None = "default", scope: str = AZURE_MANAGEMENT_SCOPE
    ) -> dict[str, Any]:
        """Request a token to confirm the service principal works."""
        token = self.azure_credential(profile).get_token(scope)
        return {"scope": scope, "token_expires_on": token.expires_on}


# --------------------------------------------------------------------------
# CLI
# --------------------------------------------------------------------------
def _prompt(label: str, default: str | None = None, secret: bool = False) -> str:
    suffix = f" [{default}]" if default else ""
    text = f"{label}{suffix}: "
    value = getpass.getpass(text) if secret else input(text)
    return value.strip() or (default or "")


def _cmd_add_aws(mgr: CloudSessionManager, args: argparse.Namespace) -> None:
    key_id = _prompt("AWS access key ID")
    secret = _prompt("AWS secret access key (hidden)", secret=True)
    token = _prompt("Session token (optional, hidden)", secret=True)
    region = _prompt("Default region", default=args.region)
    mgr.add_aws_profile(args.profile, key_id, secret, region=region, session_token=token)
    print(f"Saved AWS profile '{args.profile}' to {mgr.store.path}")


def _cmd_add_azure(mgr: CloudSessionManager, args: argparse.Namespace) -> None:
    tenant = _prompt("Tenant ID")
    client = _prompt("Client (application) ID")
    secret = _prompt("Client secret (hidden)", secret=True)
    sub = _prompt("Subscription ID (optional)")
    mgr.add_azure_profile(args.profile, tenant, client, secret, subscription_id=sub)
    print(f"Saved Azure profile '{args.profile}' to {mgr.store.path}")


def _cmd_list(mgr: CloudSessionManager, _args: argparse.Namespace) -> None:
    print(f"Store: {mgr.store.path}")
    aws = mgr.store.list_profiles("aws")
    azure = mgr.store.list_profiles("azure")
    print("AWS profiles:" + ("" if aws else " (none)"))
    for name in aws:
        c = mgr.store.get_aws(name)
        print(f"  - {name}: key={mask(c.access_key_id)} region={c.region}")
    print("Azure profiles:" + ("" if azure else " (none)"))
    for name in azure:
        c = mgr.store.get_azure(name)
        print(f"  - {name}: tenant={mask(c.tenant_id)} client={mask(c.client_id)}")


def _cmd_verify(mgr: CloudSessionManager, args: argparse.Namespace) -> None:
    if args.provider == "aws":
        print(json.dumps(mgr.verify_aws(args.profile), indent=2))
    else:
        print(json.dumps(mgr.verify_azure(args.profile), indent=2))


def _cmd_delete(mgr: CloudSessionManager, args: argparse.Namespace) -> None:
    if mgr.store.delete(args.provider, args.profile):
        print(f"Deleted {args.provider} profile '{args.profile}'")
    else:
        print(f"No {args.provider} profile named '{args.profile}'")


def _cmd_generate_key(_mgr: CloudSessionManager, _args: argparse.Namespace) -> None:
    try:
        from cryptography.fernet import Fernet
    except ImportError:
        sys.exit("Install cryptography first: pip install cryptography")
    print(Fernet.generate_key().decode())
    print(
        f"\nSet it in your environment, e.g.  export {ENV_MASTER_KEY}=<key>\n"
        "Do not store it next to the credentials file.",
        file=sys.stderr,
    )


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description="CloudSentinel credential manager")
    sub = parser.add_subparsers(dest="command", required=True)

    p = sub.add_parser("add-aws", help="save AWS keys")
    p.add_argument("--profile", default="default")
    p.add_argument("--region", default="us-east-1")
    p.set_defaults(func=_cmd_add_aws)

    p = sub.add_parser("add-azure", help="save Azure service principal")
    p.add_argument("--profile", default="default")
    p.set_defaults(func=_cmd_add_azure)

    p = sub.add_parser("list", help="list stored profiles (secrets masked)")
    p.set_defaults(func=_cmd_list)

    p = sub.add_parser("verify", help="test that stored credentials work")
    p.add_argument("provider", choices=["aws", "azure"])
    p.add_argument("--profile", default="default")
    p.set_defaults(func=_cmd_verify)

    p = sub.add_parser("delete", help="remove a stored profile")
    p.add_argument("provider", choices=["aws", "azure"])
    p.add_argument("--profile", default="default")
    p.set_defaults(func=_cmd_delete)

    p = sub.add_parser("generate-key", help="create a Fernet master key")
    p.set_defaults(func=_cmd_generate_key)

    args = parser.parse_args(argv)
    try:
        args.func(CloudSessionManager(), args)
    except CredentialError as exc:
        sys.exit(f"Error: {exc}")


if __name__ == "__main__":
    main()