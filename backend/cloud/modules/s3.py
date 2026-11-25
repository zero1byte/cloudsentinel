from cloud.cloud_manager import cloud_manager


class S3BucketModule:
    def __init__(self):
        self.s3_bucket_name = None;
        self.s3_client = cloud_manager.get_aws_client(
            service_name="s3",
            region="us-east-1"
        )

    def bucket_list(self):
        response = self.s3_client.list_buckets()
        return response.get("Buckets", [])

    def bucket_objects(self, bucket_name):
        response = self.s3_client.list_objects_v2(Bucket=bucket_name)
        return response.get("Contents", [])

    def read_object(self, bucket: str, key: str):
        """Return the streaming body of one object."""
        return self.s3_client.get_object(Bucket=bucket, Key=key)["Body"]
    
