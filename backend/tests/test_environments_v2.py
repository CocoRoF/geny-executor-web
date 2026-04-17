"""L2.B — v2 environment template endpoints.

Covers the new CRUD surface added in v0.8.0:
- POST with mode=blank / from_preset / from_session (and inferred modes).
- PUT /{id}/manifest (whole-template replace).
- PATCH /{id}/stages/{order} (per-stage partial update).
- POST /{id}/duplicate.

Runs against the `FakeEnvironmentService` in conftest — fast and free of
geny_executor at import time.
"""

from __future__ import annotations

import pytest


# ── POST /api/environments ──────────────────────────────────


@pytest.mark.asyncio
async def test_create_blank_explicit_mode(client):
    resp = await client.post(
        "/api/environments",
        json={"mode": "blank", "name": "blank-env"},
    )
    assert resp.status_code == 200
    env_id = resp.json()["id"]

    resp = await client.get(f"/api/environments/{env_id}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["name"] == "blank-env"
    assert data["manifest"] is not None
    assert data["manifest"]["stages"] == []


@pytest.mark.asyncio
async def test_create_from_preset(client):
    resp = await client.post(
        "/api/environments",
        json={"mode": "from_preset", "preset_name": "chat", "name": "chat-env"},
    )
    assert resp.status_code == 200
    env_id = resp.json()["id"]

    resp = await client.get(f"/api/environments/{env_id}")
    data = resp.json()
    assert data["manifest"]["metadata"]["base_preset"] == "chat"
    assert len(data["manifest"]["stages"]) >= 1


@pytest.mark.asyncio
async def test_create_from_preset_unknown_returns_400(client):
    resp = await client.post(
        "/api/environments",
        json={"mode": "from_preset", "preset_name": "bogus", "name": "x"},
    )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_create_mode_inferred_from_session_id(client):
    # Existing callers POST {session_id, name} without a mode — must still
    # work as a from_session create.
    sess = await client.post(
        "/api/sessions", json={"preset": "chat", "api_key": "sk-test-key"}
    )
    sid = sess.json()["session_id"]

    resp = await client.post(
        "/api/environments", json={"session_id": sid, "name": "legacy-shape"}
    )
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_create_from_session_without_session_id_returns_422(client):
    resp = await client.post(
        "/api/environments",
        json={"mode": "from_session", "name": "x"},
    )
    assert resp.status_code == 422


# ── PUT /api/environments/{id}/manifest ─────────────────────


@pytest.mark.asyncio
async def test_replace_manifest(client):
    new = await client.post(
        "/api/environments",
        json={"mode": "blank", "name": "pre-replace"},
    )
    env_id = new.json()["id"]

    new_manifest = {
        "version": "2.0",
        "metadata": {
            "id": env_id,
            "name": "post-replace",
            "description": "rewritten",
            "tags": ["edited"],
        },
        "model": {},
        "pipeline": {},
        "stages": [
            {
                "order": 1,
                "name": "s01_input",
                "active": True,
                "artifact": "default",
            }
        ],
        "tools": {},
    }
    resp = await client.put(
        f"/api/environments/{env_id}/manifest", json={"manifest": new_manifest}
    )
    assert resp.status_code == 200
    payload = resp.json()
    assert payload["name"] == "post-replace"
    assert len(payload["manifest"]["stages"]) == 1


@pytest.mark.asyncio
async def test_replace_manifest_unknown_returns_404(client):
    resp = await client.put(
        "/api/environments/nonexistent/manifest",
        json={"manifest": {"version": "2.0", "metadata": {"name": "x"}}},
    )
    assert resp.status_code == 404


# ── PATCH /api/environments/{id}/stages/{order} ────────────


@pytest.mark.asyncio
async def test_patch_stage(client):
    new = await client.post(
        "/api/environments",
        json={"mode": "from_preset", "preset_name": "chat", "name": "patch-target"},
    )
    env_id = new.json()["id"]

    resp = await client.patch(
        f"/api/environments/{env_id}/stages/1",
        json={"artifact": "openai", "active": False},
    )
    assert resp.status_code == 200
    data = resp.json()
    target = next(s for s in data["manifest"]["stages"] if s["order"] == 1)
    assert target["artifact"] == "openai"
    assert target["active"] is False


@pytest.mark.asyncio
async def test_patch_stage_unknown_order_returns_400(client):
    new = await client.post(
        "/api/environments",
        json={"mode": "from_preset", "preset_name": "chat", "name": "bad-order"},
    )
    env_id = new.json()["id"]

    resp = await client.patch(
        f"/api/environments/{env_id}/stages/99",
        json={"artifact": "openai"},
    )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_patch_stage_unknown_env_returns_404(client):
    resp = await client.patch(
        "/api/environments/nonexistent/stages/1", json={"artifact": "openai"}
    )
    assert resp.status_code == 404


# ── POST /api/environments/{id}/duplicate ──────────────────


@pytest.mark.asyncio
async def test_duplicate_environment(client):
    new = await client.post(
        "/api/environments",
        json={"mode": "from_preset", "preset_name": "chat", "name": "source"},
    )
    src_id = new.json()["id"]

    resp = await client.post(
        f"/api/environments/{src_id}/duplicate",
        json={"new_name": "copy"},
    )
    assert resp.status_code == 200
    dup_id = resp.json()["id"]
    assert dup_id != src_id

    resp = await client.get(f"/api/environments/{dup_id}")
    assert resp.json()["name"] == "copy"


@pytest.mark.asyncio
async def test_duplicate_unknown_returns_404(client):
    resp = await client.post(
        "/api/environments/nonexistent/duplicate",
        json={"new_name": "x"},
    )
    assert resp.status_code == 404
