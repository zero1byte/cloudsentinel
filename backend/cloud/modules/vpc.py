from cloud.cloud_manager import cloud_manager


class VPC:

    def __init__(self, aws_key, region="us-east-1"):
        self.client = cloud_manager.get_aws_client(
            key=aws_key,
            service_name="ec2",
            region=region
        )

    def get_vpcs(self):
        response = self.client.describe_vpcs()

        return response.get("Vpcs", [])