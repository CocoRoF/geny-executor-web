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

from app.services.exceptions import EnvironmentNotFoundError as _RealEnvNotFound


# ── Fake service layer ───────────────────────────────────

_SESSIONS: dict[str, SimpleNamespace] = {}


def _make_fake_session(session_id: str, preset: str = "chat"):
    """Return a minimal fake session object."""
    state = SimpleNamespace(
        messages=[],
        iteration=0,
        total_cost_usd=0.0,
        model="claude-sonnet-4-20250514",
        token_usage=SimpleNamespace(
            input_tokens=0,
            output_tokens=0,
            cache_creation_input_tokens=0,
            cache_read_input_tokens=0,
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

    def describe_pipeline(self, preset):
        return SimpleNamespace(
            name="test-pipeline",
            stages=[
                SimpleNamespace(
                    name="input_stage",
                    order=1,
                    category="A",
                    is_active=True,
                    strategies=[],
                ),
            ],
        )


class FakeSessionService:
    _counter = 0

    def __init__(self):
        self._sessions: dict[str, SimpleNamespace] = {}
        self._presets: dict[str, str] = {}

    def create(self, pipeline, preset="chat"):
        FakeSessionService._counter += 1
        sid = f"sess-{FakeSessionService._counter}"
        s = _make_fake_session(sid, preset)
        self._sessions[sid] = s
        self._presets[sid] = preset
        return s

    def get(self, session_id: str):
        return self._sessions.get(session_id)

    def get_preset(self, session_id: str):
        return self._presets.get(session_id, "unknown")

    def delete(self, session_id: str):
        if session_id in self._sessions:
            del self._sessions[session_id]
            self._presets.pop(session_id, None)
            return True
        return False

    def list_all(self):
        result = []
        for sid, s in self._sessions.items():
            result.append(
                {
                    "session_id": sid,
                    "preset": self._presets.get(sid, "unknown"),
                    "freshness": s.freshness.value,
                    "message_count": len(s.state.messages),
                    "iteration": s.state.iteration,
                    "total_cost_usd": s.state.total_cost_usd,
                }
            )
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


class FakeEnvironmentNotFound(_RealEnvNotFound):
    pass


def _blank_manifest(name: str, description: str, tags: list[str], env_id: str) -> dict:
    return {
        "version": "2.0",
        "metadata": {
            "id": env_id,
            "name": name,
            "description": description,
            "tags": list(tags),
            "created_at": "2025-01-01T00:00:00Z",
            "updated_at": "2025-01-01T00:00:00Z",
        },
        "model": {},
        "pipeline": {},
        "stages": [],
        "tools": {},
    }


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
                "stage_count": len(
                    (e.get("manifest") or {}).get("stages", [])
                    or e.get("snapshot", {}).get("stages", [])
                ),
                "model": (e.get("manifest") or {}).get("model", {}).get("model", ""),
            }
            for eid, e in self._envs.items()
        ]

    def _new_id(self) -> str:
        import uuid

        return uuid.uuid4().hex[:12]

    def save(self, session, mutator, name, description="", tags=None):
        eid = self._new_id()
        tags_list = tags or []
        self._envs[eid] = {
            "id": eid,
            "name": name,
            "description": description,
            "tags": tags_list,
            "created_at": "2025-01-01T00:00:00Z",
            "updated_at": "2025-01-01T00:00:00Z",
            "manifest": _blank_manifest(name, description, tags_list, eid),
        }
        return eid

    def create_blank(self, name, description="", tags=None, base_preset=None):
        eid = self._new_id()
        tags_list = tags or []
        manifest = _blank_manifest(name, description, tags_list, eid)
        if base_preset:
            manifest["metadata"]["base_preset"] = base_preset
        self._envs[eid] = {
            "id": eid,
            "name": name,
            "description": description,
            "tags": tags_list,
            "created_at": "2025-01-01T00:00:00Z",
            "updated_at": "2025-01-01T00:00:00Z",
            "manifest": manifest,
        }
        return eid

    def create_from_preset(self, preset_name, name, description="", tags=None):
        if preset_name not in {"minimal", "chat", "agent", "evaluator", "geny_vtuber"}:
            raise ValueError(f"Unknown preset: {preset_name}")
        eid = self._new_id()
        tags_list = tags or []
        manifest = _blank_manifest(name, description, tags_list, eid)
        manifest["metadata"]["base_preset"] = preset_name
        manifest["stages"] = [
            {"order": 1, "name": "s01_input", "active": True, "artifact": "default"}
        ]
        self._envs[eid] = {
            "id": eid,
            "name": name,
            "description": description,
            "tags": tags_list,
            "created_at": "2025-01-01T00:00:00Z",
            "updated_at": "2025-01-01T00:00:00Z",
            "manifest": manifest,
        }
        return eid

    def load(self, env_id: str):
        return self._envs.get(env_id)

    def update(self, env_id: str, data: dict):
        if env_id not in self._envs:
            return None
        self._envs[env_id].update(data)
        return self._envs[env_id]

    def update_manifest(self, env_id: str, manifest):
        if env_id not in self._envs:
            raise FakeEnvironmentNotFound(env_id)
        # Accept either a dict or an object with a to_dict method.
        payload = manifest.to_dict() if hasattr(manifest, "to_dict") else dict(manifest)
        payload.setdefault("metadata", {})["id"] = env_id
        self._envs[env_id]["manifest"] = payload
        self._envs[env_id]["name"] = payload["metadata"].get(
            "name", self._envs[env_id]["name"]
        )
        self._envs[env_id]["description"] = payload["metadata"].get(
            "description", self._envs[env_id].get("description", "")
        )
        self._envs[env_id]["tags"] = list(
            payload["metadata"].get("tags", self._envs[env_id].get("tags", []))
        )
        self._envs[env_id]["updated_at"] = "2025-01-01T00:00:00Z"
        return self._envs[env_id]

    def update_stage(self, env_id: str, order: int, **fields):
        if env_id not in self._envs:
            raise FakeEnvironmentNotFound(env_id)
        manifest = self._envs[env_id].get("manifest")
        if manifest is None:
            raise ValueError("No manifest on environment")
        stages = manifest.setdefault("stages", [])
        target = next((s for s in stages if s.get("order") == order), None)
        if target is None:
            raise ValueError(f"Stage {order} not found in environment {env_id}")
        for k, v in fields.items():
            target[k] = v
        manifest.setdefault("metadata", {})["updated_at"] = "2025-01-01T00:00:00Z"
        self._envs[env_id]["updated_at"] = "2025-01-01T00:00:00Z"
        return self._envs[env_id]

    def duplicate(self, env_id: str, new_name: str):
        src = self._envs.get(env_id)
        if src is None:
            return None
        new_id = self._new_id()
        import copy

        clone = copy.deepcopy(src)
        clone["id"] = new_id
        clone["name"] = new_name
        if "manifest" in clone and isinstance(clone["manifest"], dict):
            clone["manifest"].setdefault("metadata", {})
            clone["manifest"]["metadata"]["id"] = new_id
            clone["manifest"]["metadata"]["name"] = new_name
        self._envs[new_id] = clone
        return new_id

    def delete(self, env_id: str):
        return self._envs.pop(env_id, None) is not None

    def export_json(self, env_id: str):
        e = self._envs.get(env_id)
        if e is None:
            return None
        return e

    def import_json(self, data: dict):
        eid = self._new_id()
        self._envs[eid] = {"id": eid, "name": data.get("name", "imported"), **data}
        return eid

    def instantiate_pipeline(self, env_id: str, *, api_key: str, strict: bool = True):
        if env_id not in self._envs:
            raise FakeEnvironmentNotFound(env_id)
        return SimpleNamespace(id=f"pipe-from-{env_id}", _api_key=api_key)

    def diff(self, a: str, b: str):
        return []


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
        return {
            "total": 0,
            "completed": 0,
            "errors": 0,
            "total_cost": 0.0,
            "total_tokens": 0,
            "avg_duration_ms": 0.0,
        }

    def get_stage_stats(self, session_id=None):
        return []

    def get_cost_summary(self, session_id=None):
        return {
            "session_id": session_id,
            "by_model": [],
            "total_cost": 0.0,
            "total_executions": 0,
        }

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
