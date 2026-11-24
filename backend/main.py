from fastapi import FastAPI

from api import storekeys
from api.aws import cloudtrail

app = FastAPI(
    title="CloudSentinel API",
    version="1.0.0"
)

app.include_router(
    storekeys.router,
    prefix="/api/v1"
)

app.include_router(
    cloudtrail.router,
    prefix="/api/v1"
)

@app.get("/")
async def root():

    return {
        "message": "CloudSentinel API",
        "version": "1.0.0"
    }

@app.get("/health")
async def health():

    return {
        "status": "ok"
    }