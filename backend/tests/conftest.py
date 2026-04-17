"""Shared fixtures for backend E2E tests."""

from __future__ import annotations

import sys
import os

# Ensure the backend package is importable
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from unittest.mock import MagicMock
from types import SimpleNamespace

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware


# ── Fake service layer ───────────────────────────────────

_SESSIONS: dict[str, SimpleNamespace] = {}


def _make_fake_session(session_id: str, preset: str = "chat", engine: str = "executor"):
    """Return a minimal fake session object."""
    state = SimpleNamespace(
        messages=[],
        iteration=0,
        total_cost_usd=0.0,
        model="claude-sonnet-4-20250514",
        token_usage=SimpleNamespace(
            input_tokens=0, output_tokens=0,
            cache_creation_input_tokens=0, cache_read_input_tokens=0,
        ),
    )
    return SimpleNamespace(
        id=session_id,
        state=state,
        freshness=SimpleNamespace(value="fresh"),
    )


class FakePipelineService:
    def create_pipeline(self, **kwargs):
        return SimpleNamespace(id="pipe-1")

    def describe_pipeline(self, preset, engine="executor"):
        return SimpleNamespace(
            name="test-pipeline",
            stages=[
                SimpleNamespace(
                    name="input_stage", order=1, category="A",
                    is_active=True, strategies=[],
                ),
            ],
        )


class FakeSessionService:
    _counter = 0

    def __init__(self):
        self._sessions: dict[str, SimpleNamespace] = {}
        self._presets: dict[str, str] = {}
        self._engines: dict[str, str] = {}

    def create(self, pipeline, preset="chat", engine="executor"):
        FakeSessionService._counter += 1
        sid = f"sess-{FakeSessionService._counter}"
        s = _make_fake_session(sid, preset, engine)
        self._sessions[sid] = s
        self._presets[sid] = preset
        self._engines[sid] = engine
        return s

    def get(self, session_id: str):
        return self._sessions.get(session_id)

    def get_preset(self, session_id: str):
        return self._presets.get(session_id, "unknown")

    def get_engine(self, session_id: str):
        return self._engines.get(session_id, "executor")

    def delete(self, session_id: str):
        if session_id in self._sessions:
            del self._sessions[session_id]
            self._presets.pop(session_id, None)
            self._engines.pop(session_id, None)
            return True
        return False

    def list_all(self):
        result = []
        for sid, s in self._sessions.items():
            result.append({
                "session_id": sid,
                "preset": self._presets.get(sid, "unknown"),
                "engine": self._engines.get(sid, "executor"),
                "freshness": s.freshness.value,
                "message_count": len(s.state.messages),
                "iteration": s.state.iteration,
                "total_cost_usd": s.state.total_cost_usd,
            })
        return result


class FakeMutationService:
    def get_or_create(self, session):
        return SimpleNamespace(
            snapshot=lambda description="": SimpleNamespace(
                to_dict=lambda: {"stages": [], "model": "claude-sonnet-4-20250514"}
            ),
            mutations=[],
        )


class FakeToolService:
    def list_tools(self, session):
        return []

    def get_tool(self, session, name):
        return None


class FakeEnvironmentService:
    def __init__(self):
        self._envs: dict[str, dict] = {}

    def list_all(self):
        return [
            {
                "id": eid,
                "name": e["name"],
                "description": e.get("description", ""),
                "tags": e.get("tags", []),
                "created_at": e.get("created_at", ""),
                "updated_at": e.get("updated_at", ""),
                "stage_count": 0,
                "model": "",
            }
            for eid, e in self._envs.items()
        ]

    def save(self, session, mutator, name, description="", tags=None):
        import uuid
        eid = uuid.uuid4().hex[:12]
        self._envs[eid] = {
            "id": eid,
            "name": name,
            "description": description,
            "tags": tags or [],
            "created_at": "2025-01-01T00:00:00Z",
            "updated_at": "2025-01-01T00:00:00Z",
            "snapshot": {},
        }
        return eid

    def load(self, env_id: str):
        return self._envs.get(env_id)

    def update(self, env_id: str, data: dict):
        if env_id not in self._envs:
            return None
        self._envs[env_id].update(data)
        return self._envs[env_id]

    def delete(self, env_id: str):
        return self._envs.pop(env_id, None) is not None

    def export_json(self, env_id: str):
        e = self._envs.get(env_id)
        if e is None:
            return None
        return e

    def import_json(self, data: dict):
        import uuid
        eid = uuid.uuid4().hex[:12]
        self._envs[eid] = {"id": eid, "name": "imported", **data}
        return eid


class FakeHistoryService:
    def __init__(self):
        self._runs = []

    def list_runs(self, session_id=None, model=None, status=None, limit=50, offset=0):
        return []

    def count_runs(self, session_id=None, model=None, status=None):
        return 0

    def get_detail(self, run_id):
        return None

    def get_events(self, run_id):
        return []

    def export_run(self, run_id):
        return None

    def get(self, run_id):
        return None

    def delete(self, run_id):
        pass

    def get_waterfall(self, run_id):
        return None

    def get_stats(self, session_id=None):
        return {"total": 0, "completed": 0, "errors": 0, "total_cost": 0.0, "total_tokens": 0, "avg_duration_ms": 0.0}

    def get_stage_stats(self, session_id=None):
        return []

    def get_cost_summary(self, session_id=None):
        return {"session_id": session_id, "by_model": [], "total_cost": 0.0, "total_executions": 0}

    def get_cost_trend(self, session_id=None, granularity="hour", limit=168):
        return []  # router expects a list of dicts


# ── App factory ──────────────────────────────────────────

def _create_test_app() -> FastAPI:
    """Build a FastAPI app with fake services injected directly (no lifespan)."""
    from app.routers import health, session, stage_editor
    from app.routers import tool_manager, environment, history

    test_app = FastAPI()
    test_app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Inject fake services directly on state
    test_app.state.pipeline_service = FakePipelineService()
    test_app.state.session_service = FakeSessionService()
    test_app.state.mutation_service = FakeMutationService()
    test_app.state.tool_service = FakeToolService()
    test_app.state.environment_service = FakeEnvironmentService()
    test_app.state.history_service = FakeHistoryService()
    test_app.state.editor_sync = MagicMock()

    test_app.include_router(health.router)
    test_app.include_router(session.router)
    test_app.include_router(environment.router)
    test_app.include_router(history.router)
    test_app.include_router(tool_manager.router)
    test_app.include_router(stage_editor.router)
    return test_app


# ── Fixtures ─────────────────────────────────────────────

@pytest.fixture(scope="module")
def test_app():
    return _create_test_app()


@pytest_asyncio.fixture
async def client(test_app):
    transport = ASGITransport(app=test_app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
