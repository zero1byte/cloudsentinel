from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, ConfigDict

from services.managekeys import manage_keys

router = APIRouter(prefix="/keys", tags=["Cloud Credentials"])


class CloudAccount(BaseModel):
    model_config = ConfigDict(extra="forbid")

    platform_name: str
    key: str
    secret: str


@router.post("/")
def add_key(account: CloudAccount):

    if not account.platform_name or not account.key or not account.secret:
        raise HTTPException(status_code=400, detail="All fields are required - platform_name, key, secret")

    if any(
        existing_account["platform_name"] == account.platform_name
        for existing_account in manage_keys.get_accounts()
    ):
        raise HTTPException(status_code=400, detail="Account with this platform_name already exists")

    manage_keys.add_account(account.model_dump())

    return {"message": "Cloud account added successfully"}


@router.get("/")
def get_all_keys():

    return manage_keys.get_accounts()


@router.put("/{key}")
def update_key(key: str, updates: dict):

    if not manage_keys.update_account(key, updates):
        raise HTTPException(status_code=404, detail="Account not found")

    return {"message": "Account updated successfully"}


@router.delete("/{key}")
def delete_key(key: str):

    if not manage_keys.delete_account(key):
        raise HTTPException(status_code=404, detail="Account not found")

    return {"message": "Account deleted successfully"}