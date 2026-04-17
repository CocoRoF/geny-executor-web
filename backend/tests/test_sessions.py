"""E2E tests — Session CRUD endpoints."""

import pytest


@pytest.mark.asyncio
async def test_create_session(client):
    resp = await client.post("/api/sessions", json={
        "preset": "chat",
        "api_key": "sk-test-key",
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "session_id" in data
    assert data["preset"] == "chat"


@pytest.mark.asyncio
async def test_list_sessions(client):
    # Create one
    resp = await client.post("/api/sessions", json={
        "preset": "chat",
        "api_key": "sk-test-key",
    })
    sid = resp.json()["session_id"]

    resp = await client.get("/api/sessions")
    assert resp.status_code == 200
    data = resp.json()
    assert "sessions" in data
    ids = [s["session_id"] for s in data["sessions"]]
    assert sid in ids


@pytest.mark.asyncio
async def test_get_session(client):
    resp = await client.post("/api/sessions", json={
        "preset": "chat",
        "api_key": "sk-test-key",
    })
    sid = resp.json()["session_id"]

    resp = await client.get(f"/api/sessions/{sid}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["session_id"] == sid
    assert data["preset"] == "chat"


@pytest.mark.asyncio
async def test_get_session_not_found(client):
    resp = await client.get("/api/sessions/nonexistent")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_delete_session(client):
    resp = await client.post("/api/sessions", json={
        "preset": "chat",
        "api_key": "sk-test-key",
    })
    sid = resp.json()["session_id"]

    resp = await client.delete(f"/api/sessions/{sid}")
    assert resp.status_code == 200
    assert resp.json()["deleted"] is True

    # Verify it's gone
    resp = await client.get(f"/api/sessions/{sid}")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_delete_session_not_found(client):
    resp = await client.delete("/api/sessions/nonexistent")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_create_session_no_api_key(client):
    resp = await client.post("/api/sessions", json={
        "preset": "chat",
        "api_key": "",
    })
    # Should fail if no default key configured
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_create_session_invalid_preset(client):
    resp = await client.post("/api/sessions", json={
        "preset": "invalid_preset",
        "api_key": "sk-test-key",
    })
    assert resp.status_code == 422  # validation error
