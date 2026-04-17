"""E2E tests — Environment CRUD endpoints."""

import pytest


@pytest.mark.asyncio
async def test_list_environments_empty(client):
    resp = await client.get("/api/environments")
    assert resp.status_code == 200
    data = resp.json()
    assert "environments" in data


@pytest.mark.asyncio
async def test_save_environment(client):
    # Need a session first
    resp = await client.post(
        "/api/sessions",
        json={
            "preset": "chat",
            "api_key": "sk-test-key",
        },
    )
    sid = resp.json()["session_id"]

    resp = await client.post(
        "/api/environments",
        json={
            "session_id": sid,
            "name": "Test Env",
            "description": "A test environment",
            "tags": ["test"],
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "id" in data
    return data["id"]


@pytest.mark.asyncio
async def test_save_and_get_environment(client):
    resp = await client.post(
        "/api/sessions",
        json={
            "preset": "chat",
            "api_key": "sk-test-key",
        },
    )
    sid = resp.json()["session_id"]

    resp = await client.post(
        "/api/environments",
        json={
            "session_id": sid,
            "name": "GetTest",
            "description": "get test",
            "tags": ["a"],
        },
    )
    env_id = resp.json()["id"]

    resp = await client.get(f"/api/environments/{env_id}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["id"] == env_id
    assert data["name"] == "GetTest"


@pytest.mark.asyncio
async def test_get_environment_not_found(client):
    resp = await client.get("/api/environments/nonexistent")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_update_environment(client):
    resp = await client.post(
        "/api/sessions",
        json={
            "preset": "chat",
            "api_key": "sk-test-key",
        },
    )
    sid = resp.json()["session_id"]

    resp = await client.post(
        "/api/environments",
        json={
            "session_id": sid,
            "name": "Before",
        },
    )
    env_id = resp.json()["id"]

    resp = await client.put(
        f"/api/environments/{env_id}",
        json={
            "name": "After",
            "description": "updated",
        },
    )
    assert resp.status_code == 200
    assert resp.json()["updated"] is True


@pytest.mark.asyncio
async def test_update_environment_not_found(client):
    resp = await client.put("/api/environments/nonexistent", json={"name": "x"})
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_delete_environment(client):
    resp = await client.post(
        "/api/sessions",
        json={
            "preset": "chat",
            "api_key": "sk-test-key",
        },
    )
    sid = resp.json()["session_id"]

    resp = await client.post(
        "/api/environments",
        json={
            "session_id": sid,
            "name": "ToDelete",
        },
    )
    env_id = resp.json()["id"]

    resp = await client.delete(f"/api/environments/{env_id}")
    assert resp.status_code == 200
    assert resp.json()["deleted"] is True

    resp = await client.get(f"/api/environments/{env_id}")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_delete_environment_not_found(client):
    resp = await client.delete("/api/environments/nonexistent")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_export_environment(client):
    resp = await client.post(
        "/api/sessions",
        json={
            "preset": "chat",
            "api_key": "sk-test-key",
        },
    )
    sid = resp.json()["session_id"]

    resp = await client.post(
        "/api/environments",
        json={
            "session_id": sid,
            "name": "ExportTest",
        },
    )
    env_id = resp.json()["id"]

    resp = await client.get(f"/api/environments/{env_id}/export")
    assert resp.status_code == 200
    assert "data" in resp.json()


@pytest.mark.asyncio
async def test_import_environment(client):
    resp = await client.post(
        "/api/environments/import",
        json={
            "data": {"name": "imported-env", "stages": []},
        },
    )
    assert resp.status_code == 200
    assert "id" in resp.json()


@pytest.mark.asyncio
async def test_save_environment_session_not_found(client):
    resp = await client.post(
        "/api/environments",
        json={
            "session_id": "nonexistent",
            "name": "Test",
        },
    )
    assert resp.status_code == 404
