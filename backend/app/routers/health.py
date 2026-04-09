"""Health check endpoint."""

from fastapi import APIRouter

router = APIRouter()


@router.get("/health")
async def health():
    """Return service health status and version."""
    return {"status": "ok", "version": "0.2.0"}
