"""L2.C — POST /api/sessions with env_id."""

from __future__ import annotations

import pytest


@pytest.mark.asyncio
async def test_create_session_from_env_id(client):
    create = await client.post(
        "/api/environments",
        json={"mode": "from_preset", "preset_name": "chat", "name": "env-source"},
    )
    env_id = create.json()["id"]

    resp = await client.post(
        "/api/sessions",
        json={"env_id": env_id, "api_key": "sk-test-key"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["env_id"] == env_id
    assert data["preset"] == f"env:{env_id}"
    assert data["session_id"].startswith("sess-")


@pytest.mark.asyncio
async def test_create_session_from_unknown_env_returns_404(client):
    resp = await client.post(
        "/api/sessions",
        json={"env_id": "nonexistent", "api_key": "sk-test-key"},
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_env_id_path_still_requires_api_key(client):
    create = await client.post(
        "/api/environments",
        json={"mode": "from_preset", "preset_name": "chat", "name": "need-key"},
    )
    env_id = create.json()["id"]

    resp = await client.post(
        "/api/sessions",
        json={"env_id": env_id},  # missing api_key
    )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_preset_path_still_works(client):
    resp = await client.post(
        "/api/sessions",
        json={"preset": "chat", "api_key": "sk-test-key"},
    )
    assert resp.status_code == 200
    assert resp.json()["preset"] == "chat"
