import os
from azure.identity import ClientSecretCredential


class AzureProvider:

    def __init__(self, client_id, client_secret):
        tenant_id = os.getenv("AZURE_TENANT_ID")

        if not tenant_id:
            raise ValueError("AZURE_TENANT_ID is not configured")

        self.credential = ClientSecretCredential(
            tenant_id=tenant_id,
            client_id=client_id,
            client_secret=client_secret
        )