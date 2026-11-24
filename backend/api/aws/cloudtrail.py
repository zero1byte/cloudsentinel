"""API endpoints for retrieving AWS CloudTrail events."""

from datetime import datetime
from typing import Any, Optional

from fastapi import APIRouter, HTTPException, Query

from botocore.exceptions import BotoCoreError, ClientError

from cloud.modules.cloudtrail import CloudTrail


router = APIRouter(prefix="/cloudtrail", tags=["CloudTrail"])



@router.get("/events")
def retrieve_events(
	lookup_attribute: Optional[str] = Query(
		default=None,
		description="Lookup attribute in the form AttributeKey=AttributeValue.",
	),
	start_time: Optional[datetime] = None,
	end_time: Optional[datetime] = None,
	next_token: Optional[str] = None,
	max_results: int = Query(default=50, ge=1, le=50),
) -> list[dict[str, Any]]:
	"""Retrieve CloudTrail events with optional time and attribute filters."""
	try:
		if lookup_attribute and "=" not in lookup_attribute:
			raise HTTPException(
				status_code=400,
				detail="lookup_attribute must be in the form AttributeKey=AttributeValue.",
			)
		if start_time and end_time and start_time > end_time:
			raise HTTPException(
				status_code=400,
				detail="start_time must be earlier than or equal to end_time.",
			)

		cloud_trail = CloudTrail()
		return cloud_trail.get_events(
			lookup_attribute=lookup_attribute,
			start_time=start_time,
			end_time=end_time,
			next_token=next_token,
			max_results=max_results,
		)
	except HTTPException:
		raise
	except ClientError as exc:
		error = exc.response.get("Error", {})
		raise HTTPException(
			status_code=502,
			detail=error.get("Message", "AWS CloudTrail request failed."),
		) from exc
	except BotoCoreError as exc:
		raise HTTPException(
			status_code=502,
			detail="Unable to communicate with AWS CloudTrail.",
		) from exc
	except ValueError as exc:
		raise HTTPException(status_code=400, detail=str(exc)) from exc
	except Exception as exc:
		print(f"Unexpected error occurred while retrieving CloudTrail events: {exc}")
		raise HTTPException(
			status_code=500,
			detail="An unexpected error occurred while retrieving CloudTrail events : "+str(exc),
		) from exc
