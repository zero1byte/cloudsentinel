"""AWS CloudTrail collector (read-only).

Two ways to get CloudTrail events:

1. lookup  - CloudTrail LookupEvents API. Last 90 days of *management* events,
             no trail or bucket needed. Good for first tests.
2. s3      - Read the .json.gz log files a trail delivers to S3.
             This is the production-style path (supports data events too).

Usage (from the backend/ folder, venv active, AWS credentials configured):

    python -m app.ingestion.aws_cloudtrail lookup --hours 24 --regions us-east-1 ap-south-1
    python -m app.ingestion.aws_cloudtrail s3 --bucket my-trail-bucket --hours 24

Output: NDJSON, one raw CloudTrail record per line (default:
sample_logs/aws/cloudtrail_raw.ndjson). Normalization to the Common Event
Schema happens in a later step; this module only collects raw records.
"""

from __future__ import annotations

import argparse
import gzip
import json
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Iterator

import boto3

from app.core.cloud_session import CloudSessionManager 


def make_session(profile: str | None = None, region: str | None = None) -> boto3.Session:
    """Create a boto3 session. Credentials come from the standard AWS chain
    (profile, env vars, SSO, instance role). Never hard-code keys."""
    return CloudSessionManager().aws_session(args.profile or "default")


# --------------------------------------------------------------------------
# Option 1: LookupEvents API (management events, last 90 days)
# --------------------------------------------------------------------------
def lookup_events(
    session: boto3.Session, region: str, hours: int = 24
) -> Iterator[dict]:
    """Yield raw CloudTrail records from one region's event history.

    Note: LookupEvents is rate limited (about 2 requests/second per account
    per region) and returns management events only.
    """
    client = session.client("cloudtrail", region_name=region)
    paginator = client.get_paginator("lookup_events")

    end = datetime.now(timezone.utc)
    start = end - timedelta(hours=hours)

    for page in paginator.paginate(StartTime=start, EndTime=end):
        for event in page.get("Events", []):
            # The full original record is a JSON string in "CloudTrailEvent".
            yield json.loads(event["CloudTrailEvent"])


# --------------------------------------------------------------------------
# Option 2: read trail log files from S3
# --------------------------------------------------------------------------
def iter_s3_records(
    session: boto3.Session,
    bucket: str,
    prefix: str = "AWSLogs/",
    since: datetime | None = None,
) -> Iterator[tuple[str, dict]]:
    """Yield (s3_key, record) for every CloudTrail record in the bucket.

    Trail files look like:
    AWSLogs/<account-id>/CloudTrail/<region>/YYYY/MM/DD/<file>.json.gz
    Each file is gzip JSON: {"Records": [ {...}, {...} ]}
    """
    s3 = session.client("s3")
    paginator = s3.get_paginator("list_objects_v2")

    for page in paginator.paginate(Bucket=bucket, Prefix=prefix):
        for obj in page.get("Contents", []):
            key = obj["Key"]
            if not key.endswith(".json.gz"):
                continue
            if "/CloudTrail-Digest/" in key:  # integrity digests, no records
                continue
            if since and obj["LastModified"] < since:
                continue

            body = s3.get_object(Bucket=bucket, Key=key)["Body"].read()
            data = json.loads(gzip.decompress(body))
            for record in data.get("Records", []):
                yield key, record


# --------------------------------------------------------------------------
# CLI
# --------------------------------------------------------------------------
def _write_ndjson(records: Iterator[dict], out_path: Path) -> int:
    out_path.parent.mkdir(parents=True, exist_ok=True)
    seen: set[str] = set()  # dedupe on eventID (idempotent collection)
    count = 0
    with out_path.open("w", encoding="utf-8") as fh:
        for rec in records:
            event_id = rec.get("eventID")
            if event_id in seen:
                continue
            if event_id:
                seen.add(event_id)
            fh.write(json.dumps(rec, separators=(",", ":")) + "\n")
            count += 1
    return count


def main() -> None:
    parser = argparse.ArgumentParser(description="CloudTrail collector")
    sub = parser.add_subparsers(dest="mode", required=True)

    common = argparse.ArgumentParser(add_help=False)
    common.add_argument("--profile", default=None, help="AWS profile name")
    common.add_argument("--hours", type=int, default=24, help="look back N hours")
    common.add_argument(
        "--out", default="sample_logs/aws/cloudtrail_raw.ndjson", help="output file"
    )

    p_lookup = sub.add_parser("lookup", parents=[common])
    p_lookup.add_argument(
        "--regions",
        nargs="+",
        default=["us-east-1"],
        help="regions to query (global IAM/console events appear in us-east-1)",
    )

    p_s3 = sub.add_parser("s3", parents=[common])
    p_s3.add_argument("--bucket", required=True, help="trail S3 bucket")
    p_s3.add_argument("--prefix", default="AWSLogs/")

    args = parser.parse_args()
    session = make_session(profile=args.profile)

    if args.mode == "lookup":

        def gen() -> Iterator[dict]:
            for region in args.regions:
                yield from lookup_events(session, region, args.hours)

    else:
        since = datetime.now(timezone.utc) - timedelta(hours=args.hours)

        def gen() -> Iterator[dict]:
            for _key, rec in iter_s3_records(session, args.bucket, args.prefix, since):
                yield rec

    total = _write_ndjson(gen(), Path(args.out))
    print(f"Wrote {total} unique CloudTrail records to {args.out}")


if __name__ == "__main__":
    main()