from fastapi import FastAPI

app = FastAPI(title="CloudSentinel")

@app.get("/healthz")
def healthz():
    return {"status": "ok"}
