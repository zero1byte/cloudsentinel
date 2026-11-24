import boto3


class AWSProvider:

    def __init__(self, access_key, secret_key, region="us-east-1"):
        self.session = boto3.Session(
            aws_access_key_id=access_key,
            aws_secret_access_key=secret_key,
            region_name=region
        )

    def client(self, service_name):
        return self.session.client(service_name)

    def resource(self, service_name):
        return self.session.resource(service_name)