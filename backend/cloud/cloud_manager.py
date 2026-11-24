from services.managekeys import manage_keys

from cloud.providers.aws import AWSProvider
from cloud.providers.azure import AzureProvider


class CloudManager:

    def __init__(self):
        self.providers = {}

    def get_account(self, platform_name, key=None):
        accounts = manage_keys.get_accounts()

        for account in accounts:
            if (
                account["platform_name"].lower() == platform_name.lower()
                and (key is None or account["key"] == key)
            ):
                return account

        raise ValueError(
            f"{platform_name} account not found"
        )

    def get_provider(self, platform_name, key=None, region="us-east-1"):

        platform_name = platform_name.lower()

        account = self.get_account(platform_name, key)
        key = account["key"]
        cache_key = (platform_name, key, region)

        if cache_key in self.providers:
            return self.providers[cache_key]

        if platform_name == "aws":
            provider = AWSProvider(
                access_key=account["key"],
                secret_key=account["secret"],
                region=region
            )

        elif platform_name == "azure":
            provider = AzureProvider(
                client_id=account["key"],
                client_secret=account["secret"]
            )

        else:
            raise ValueError(
                f"Unsupported cloud platform: {platform_name}"
            )

        self.providers[cache_key] = provider

        return provider

    def get_aws_client(self, key=None, service_name=None, region="us-east-1"):
        provider = self.get_provider("aws", key, region)
        return provider.client(service_name)

    def get_aws_resource(self, key=None, service_name=None, region="us-east-1"):
        provider = self.get_provider("aws", key, region)
        return provider.resource(service_name)

    def get_azure_credential(self, key=None):
        provider = self.get_provider("azure", key)
        return provider.credential


# Shared instance for the application
cloud_manager = CloudManager()