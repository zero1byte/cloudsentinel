import gzip
import json
import re
from datetime import datetime
from typing import Optional

from botocore.exceptions import ClientError
from fastapi import APIRouter, HTTPException, Query

from cloud.modules.s3 import S3BucketModule

router = APIRouter(prefix="/s3", tags=["s3"])

MAX_DECOMPRESSED_BYTES = 20 * 1024 * 1024  # guard against huge files / gzip bombs
KEY_RE = re.compile(
    r"^AWSLogs/(?P<account>\d+)/(?P<service>[^/]+)/(?P<region>[^/]+)/"
    r"(?P<year>\d{4})/(?P<month>\d{2})/(?P<day>\d{2})/"
)


def parse_key(key: str) -> dict:
    """Derive source/region/date from an AWSLogs key so the UI can filter and group."""
    m = KEY_RE.match(key)
    if not m:
        return {"source": "unknown"}
    g = m.groupdict()
    return {
        "source": g["service"],  # CloudTrail, CloudTrail-Digest, vpcflowlogs, ...
        "account": g["account"],
        "region": g["region"],
        "date": f"{g['year']}-{g['month']}-{g['day']}",
    }


def _iso(value) -> Optional[str]:
    return value.isoformat() if isinstance(value, datetime) else value


@router.get("/buckets")
def get_bucket_names():
    """Return the names of the S3 buckets available to the configured AWS account."""
    try:
        buckets = S3BucketModule().bucket_list()
        return [b["Name"] for b in buckets if "Name" in b]
    except Exception as exc:
        raise HTTPException(
            status_code=502, detail=f"Unable to retrieve S3 buckets: {exc}"
        ) from exc


@router.get("/buckets/{bucket_name}/logs")
def list_bucket_logs(
    bucket_name: str,
    prefix: str = Query("", description="Key prefix filter, e.g. AWSLogs/<acct>/CloudTrail/us-east-1/"),
    source: Optional[str] = Query(None, description="CloudTrail, vpcflowlogs, ..."),
    region: Optional[str] = None,
    date: Optional[str] = Query(None, description="YYYY-MM-DD"),
    include_digest: bool = False,
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=500),
):
    """List log files (metadata only), newest first, with parsed source/region/date."""
    try:
        objs = S3BucketModule().bucket_objects(bucket_name)
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Unable to retrieve objects for bucket '{bucket_name}': {exc}",
        ) from exc

    items = []
    for obj in objs:
        key = obj.get("Key", "")
        if not key or key.endswith("/"):
            continue
        if prefix and not key.startswith(prefix):
            continue
        meta = parse_key(key)
        if not include_digest and meta["source"] == "CloudTrail-Digest":
            continue
        if source and meta["source"].lower() != source.lower():
            continue
        if region and meta.get("region") != region:
            continue
        if date and meta.get("date") != date:
            continue
        items.append({
            "key": key,
            "size": obj.get("Size"),
            "last_modified": _iso(obj.get("LastModified")),
            "compressed": key.endswith(".gz"),
            **meta,
        })

    items.sort(key=lambda i: i["last_modified"] or "", reverse=True)
    total = len(items)

    return {
        "total": total,
        "offset": offset,
        "limit": limit,
        "has_more": offset + limit < total,
        "items": items[offset : offset + limit],
    }


@router.get("/buckets/{bucket_name}/logs/content")
def get_log_content(
    bucket_name: str,
    key: str = Query(..., description="Full object key from the list endpoint"),
    offset: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
):
    """Download one object, gunzip it, parse it, and return a page of records."""
    if not key.startswith("AWSLogs/") or ".." in key:
        raise HTTPException(status_code=400, detail="Invalid log key")

    try:
        body = S3BucketModule().read_object(bucket_name, key)
    except ClientError as exc:
        code = exc.response["Error"]["Code"]
        status = 404 if code in ("NoSuchKey", "404") else 502
        raise HTTPException(status_code=status, detail=f"Unable to fetch '{key}': {code}") from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Unable to fetch '{key}': {exc}") from exc

    try:
        if key.endswith(".gz"):
            with gzip.GzipFile(fileobj=body) as gz:
                raw = gz.read(MAX_DECOMPRESSED_BYTES + 1)
        else:
            raw = body.read(MAX_DECOMPRESSED_BYTES + 1)
    except (OSError, EOFError) as exc:
        raise HTTPException(status_code=422, detail="Object is not valid gzip data") from exc

    if len(raw) > MAX_DECOMPRESSED_BYTES:
        raise HTTPException(status_code=413, detail="Decompressed log exceeds size limit")

    text = raw.decode("utf-8", errors="replace")

    # JSON (CloudTrail, digests, Config) vs. plain text (VPC flow logs)
    try:
        data = json.loads(text)
        if isinstance(data, dict) and isinstance(data.get("Records"), list):
            records, fmt = data["Records"], "json"
        elif isinstance(data, list):
            records, fmt = data, "json"
        else:
            records, fmt = [data], "json"
    except json.JSONDecodeError:
        records, fmt = [ln for ln in text.splitlines() if ln.strip()], "text"

    return {
        "key": key,
        **parse_key(key),
        "format": fmt,
        "total": len(records),
        "offset": offset,
        "limit": limit,
        "records": records[offset : offset + limit],
    }