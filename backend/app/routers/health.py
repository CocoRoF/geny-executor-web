"""Health check and config endpoints."""

from __future__ import annotations

from fastapi import APIRouter

from app.config import settings

router = APIRouter()


@router.get("/health")
async def health():
    """Return service health status and version."""
    return {"status": "ok", "version": "0.2.0"}


@router.get("/api/config")
async def get_config():
    """Return server-side configuration hints for the frontend."""
    return {"api_key_configured": bool(settings.default_api_key)}
