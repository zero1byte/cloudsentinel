from cloud.cloud_manager import cloud_manager


class CloudTrail:

    def __init__(self, aws_key=None, region="us-east-1"):
        self.client = cloud_manager.get_aws_client(
            service_name="cloudtrail",
            region=region
        )

    def get_events(
        self,
        lookup_attribute=None,
        start_time=None,
        end_time=None,
        next_token=None,
        max_results=50,
    ):
        params = {"MaxResults": max_results}

        if lookup_attribute is not None:
            params["LookupAttributes"] = lookup_attribute
        if start_time is not None:
            params["StartTime"] = start_time
        if end_time is not None:
            params["EndTime"] = end_time
        if next_token is not None:
            params["NextToken"] = next_token

        response = self.client.lookup_events(**params)

        return response.get("Events", [])