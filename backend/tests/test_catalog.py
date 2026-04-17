"""L2.A — /api/catalog endpoint coverage.

Session-less artifact catalog — every route should work without a live
SessionService or pipeline. We mount the real ArtifactService here because
it's a pure-import layer over the installed geny-executor library.
"""

from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pytest
import pytest_asyncio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from httpx import AsyncClient, ASGITransport

from app.routers import catalog
from app.services.artifact_service import ArtifactService, _clear_caches


@pytest.fixture(scope="module")
def catalog_app() -> FastAPI:
    # Reset module-level caches so test ordering never leaks stale state.
    _clear_caches()

    app = FastAPI()
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.state.artifact_service = ArtifactService()
    app.include_router(catalog.router)
    return app


@pytest_asyncio.fixture
async def client(catalog_app):
    transport = ASGITransport(app=catalog_app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.mark.asyncio
async def test_list_stages_returns_16(client):
    r = await client.get("/api/catalog/stages")
    assert r.status_code == 200
    payload = r.json()
    assert len(payload["stages"]) == 16
    orders = [s["order"] for s in payload["stages"]]
    assert orders == list(range(1, 17))
    s06 = next(s for s in payload["stages"] if s["order"] == 6)
    assert s06["module"] == "s06_api"
    assert s06["artifact_count"] >= 3


@pytest.mark.asyncio
async def test_describe_stage_returns_full_introspection(client):
    r = await client.get("/api/catalog/stages/6")
    assert r.status_code == 200
    payload = r.json()
    assert payload["order"] == 6
    assert payload["artifact"] == "default"
    assert "provider" in payload["strategy_slots"]
    assert "retry" in payload["strategy_slots"]


@pytest.mark.asyncio
async def test_list_artifacts_for_stage(client):
    r = await client.get("/api/catalog/stages/6/artifacts")
    assert r.status_code == 200
    names = sorted(a["name"] for a in r.json()["artifacts"])
    assert names == ["default", "google", "openai"]


@pytest.mark.asyncio
async def test_describe_specific_artifact(client):
    r = await client.get("/api/catalog/stages/6/artifacts/openai")
    assert r.status_code == 200
    payload = r.json()
    assert payload["artifact"] == "openai"
    assert payload["order"] == 6
    assert payload["artifact_info"]["name"] == "openai"


@pytest.mark.asyncio
async def test_full_catalog_bootstrap(client):
    r = await client.get("/api/catalog/full")
    assert r.status_code == 200
    stages = r.json()["stages"]
    assert len(stages) == 16
    assert [s["order"] for s in stages] == list(range(1, 17))


@pytest.mark.asyncio
async def test_unknown_stage_returns_404(client):
    r = await client.get("/api/catalog/stages/99")
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_unknown_artifact_returns_404(client):
    r = await client.get("/api/catalog/stages/6/artifacts/nonexistent")
    assert r.status_code == 404
