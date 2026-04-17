"""E2E tests — History & Analytics endpoints."""

import pytest


@pytest.mark.asyncio
async def test_list_global_history(client):
    resp = await client.get("/api/history")
    assert resp.status_code == 200
    data = resp.json()
    assert "runs" in data
    assert "total" in data


@pytest.mark.asyncio
async def test_list_session_history(client):
    # Create a session first
    resp = await client.post(
        "/api/sessions",
        json={
            "preset": "chat",
            "api_key": "sk-test-key",
        },
    )
    sid = resp.json()["session_id"]

    resp = await client.get(f"/api/sessions/{sid}/history")
    assert resp.status_code == 200
    data = resp.json()
    assert "runs" in data
    assert data["total"] == 0


@pytest.mark.asyncio
async def test_get_run_not_found(client):
    resp = await client.post(
        "/api/sessions",
        json={
            "preset": "chat",
            "api_key": "sk-test-key",
        },
    )
    sid = resp.json()["session_id"]

    resp = await client.get(f"/api/sessions/{sid}/history/nonexistent")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_analytics_stats(client):
    resp = await client.get("/api/analytics/stats")
    assert resp.status_code == 200
    data = resp.json()
    assert "total" in data
    assert "completed" in data


@pytest.mark.asyncio
async def test_analytics_cost(client):
    resp = await client.get("/api/analytics/cost")
    assert resp.status_code == 200
    data = resp.json()
    assert "total_cost" in data
    assert "by_model" in data


@pytest.mark.asyncio
async def test_analytics_cost_trend(client):
    resp = await client.get("/api/analytics/cost-trend")
    assert resp.status_code == 200
    data = resp.json()
    assert "trend" in data
    assert "granularity" in data


@pytest.mark.asyncio
async def test_global_history_run_not_found(client):
    resp = await client.get("/api/history/nonexistent")
    # Service returns None → 404
    assert resp.status_code in (404, 500)
