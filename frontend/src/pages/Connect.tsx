import { useState, type FormEvent } from "react";

type Status = { kind: "idle" | "saving" | "ok" | "error"; message?: string };

const field =
  "w-full rounded-md border border-border-strong bg-surface-2 px-3 py-2 text-foreground placeholder:text-subtle";

function Section(props: { title: string; hint: string; accent: string; children: React.ReactNode }) {
  return (
    <fieldset className="rounded-xl border border-border bg-surface p-5">
      <legend className={`px-2 text-lg font-semibold ${props.accent}`}>{props.title}</legend>
      <p className="mb-4 text-muted">{props.hint}</p>
      <div className="grid gap-4 sm:grid-cols-2">{props.children}</div>
    </fieldset>
  );
}

function Input(props: { label: string; name: string; secret?: boolean; placeholder?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-muted">{props.label}</span>
      <input
        name={props.name}
        type={props.secret ? "password" : "text"}
        placeholder={props.placeholder}
        autoComplete="off"
        spellCheck={false}
        required
        className={`${field} font-mono`}
      />
    </label>
  );
}

export default function Connect() {
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    setStatus({ kind: "saving" });
    try {
      // The backend must encrypt these at rest (or move them to a secrets manager).
      const res = await fetch("/api/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(`Server responded ${res.status}`);
      form.reset(); // clear secrets from the DOM
      setStatus({ kind: "ok", message: "Connections saved. Log ingestion will start shortly." });
    } catch (err) {
      setStatus({ kind: "error", message: err instanceof Error ? err.message : "Could not save connections." });
    }
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-semibold">Cloud connections</h1>
      <p className="mt-1 mb-6 text-muted">
        Add read-only credentials so CloudSentinel can collect logs. Credentials are sent to your backend over HTTPS and
        are never kept in the browser.
      </p>

      <form onSubmit={onSubmit} className="grid gap-6">
        <Section title="AWS" accent="text-aws" hint="Use an IAM user limited to read-only access to CloudTrail, GuardDuty and S3 log buckets.">
          <Input label="Access key ID" name="aws_access_key_id" placeholder="AKIA..." />
          <Input label="Secret access key" name="aws_secret_access_key" secret />
          <Input label="Region" name="aws_region" placeholder="us-east-1" />
        </Section>

        <Section title="Azure" accent="text-azure" hint="Use a service principal with Reader and Log Analytics Reader roles only.">
          <Input label="Tenant ID" name="azure_tenant_id" />
          <Input label="Subscription ID" name="azure_subscription_id" />
          <Input label="Client ID" name="azure_client_id" />
          <Input label="Client secret" name="azure_client_secret" secret />
        </Section>

        <div className="flex flex-wrap items-center gap-4">
          <button
            type="submit"
            disabled={status.kind === "saving"}
            className="rounded-md bg-brand px-4 py-2 font-medium text-brand-foreground hover:bg-brand-hover disabled:opacity-60"
          >
            {status.kind === "saving" ? "Saving..." : "Save connections"}
          </button>
          <p
            role="status"
            className={status.kind === "error" ? "text-danger" : status.kind === "ok" ? "text-success" : "text-muted"}
          >
            {status.message}
          </p>
        </div>
      </form>
    </div>
  );
}