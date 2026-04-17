"""E2E tests — Health & Config endpoints."""

import pytest


@pytest.mark.asyncio
async def test_health(client):
    resp = await client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert "version" in data


@pytest.mark.asyncio
async def test_config(client):
    resp = await client.get("/api/config")
    assert resp.status_code == 200
    data = resp.json()
    assert "api_key_configured" in data
