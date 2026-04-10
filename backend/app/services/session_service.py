"""Session management service wrapping geny-executor's or geny-harness's SessionManager."""

from __future__ import annotations

from typing import AsyncIterator

from app.services.engine import get_engine_modules, EngineType


class SessionService:
    """Wraps SessionManager with preset and engine tracking."""

    def __init__(self) -> None:
        """Initialize with empty managers and tracking maps."""
        self._managers: dict[str, object] = {}  # engine -> SessionManager
        self._presets: dict[str, str] = {}  # session_id -> preset name
        self._engines: dict[str, str] = {}  # session_id -> engine

    def _get_manager(self, engine: EngineType):
        """Return (or lazily create) the SessionManager for the given engine."""
        if engine not in self._managers:
            modules = get_engine_modules(engine)
            self._managers[engine] = modules["SessionManager"]()
        return self._managers[engine]

    def create(self, pipeline, preset: str, engine: EngineType = "executor"):
        """Create a new session from a pipeline and record its preset and engine."""
        manager = self._get_manager(engine)
        session = manager.create(pipeline)
        self._presets[session.id] = preset
        self._engines[session.id] = engine
        return session

    def get(self, session_id: str):
        """Return session by ID, or None if not found."""
        engine = self._engines.get(session_id, "executor")
        manager = self._get_manager(engine)
        return manager.get(session_id)

    def get_preset(self, session_id: str) -> str:
        """Return the preset name used to create this session."""
        return self._presets.get(session_id, "unknown")

    def get_engine(self, session_id: str) -> str:
        """Return the engine used to create this session."""
        return self._engines.get(session_id, "executor")

    def delete(self, session_id: str) -> bool:
        """Delete a session and remove its preset/engine records. Returns True if existed."""
        engine = self._engines.pop(session_id, "executor")
        self._presets.pop(session_id, None)
        manager = self._get_manager(engine)
        return manager.delete(session_id)

    def list_all(self) -> list[dict]:
        """Return summary dicts for all active sessions across all engines."""
        result = []
        for engine, manager in self._managers.items():
            for info in manager.list_sessions():
                result.append(
                    {
                        "session_id": info.session_id,
                        "preset": self._presets.get(info.session_id, "unknown"),
                        "engine": self._engines.get(info.session_id, engine),
                        "freshness": info.freshness,
                        "message_count": info.message_count,
                        "iteration": info.iteration,
                        "total_cost_usd": info.total_cost_usd,
                    }
                )
        return result

    async def run_stream(self, session_id: str, input_text: str) -> AsyncIterator:
        """Stream pipeline execution events, enriching pipeline.complete with token data."""
        engine = self._engines.get(session_id, "executor")
        manager = self._get_manager(engine)
        session = manager.get(session_id)
        if session is None:
            raise ValueError(f"Session not found: {session_id}")

        async for event in session.run_stream(input_text):
            # Enrich pipeline.complete with token usage and cost from session state
            if event.type == "pipeline.complete":
                state = session.state
                # PyO3 PipelineEvent.data returns a copy, so use setter pattern
                enriched = dict(event.data)
                enriched.update(
                    {
                        "total_cost_usd": state.total_cost_usd,
                        "model": state.model,
                        "input_tokens": state.token_usage.input_tokens,
                        "output_tokens": state.token_usage.output_tokens,
                        "cache_creation_input_tokens": state.token_usage.cache_creation_input_tokens,
                        "cache_read_input_tokens": state.token_usage.cache_read_input_tokens,
                    }
                )
                event.data = enriched
            yield event

    async def run(self, session_id: str, input_text: str) -> dict:
        """Run pipeline to completion and return result dict with token usage."""
        engine = self._engines.get(session_id, "executor")
        manager = self._get_manager(engine)
        session = manager.get(session_id)
        if session is None:
            raise ValueError(f"Session not found: {session_id}")
        result = await session.run(input_text)
        state = session.state
        return {
            "success": result.success,
            "text": result.text,
            "error": result.error,
            "iterations": result.iterations,
            "total_cost_usd": result.total_cost_usd,
            "model": result.model,
            "token_usage": {
                "input_tokens": state.token_usage.input_tokens,
                "output_tokens": state.token_usage.output_tokens,
                "cache_creation_input_tokens": state.token_usage.cache_creation_input_tokens,
                "cache_read_input_tokens": state.token_usage.cache_read_input_tokens,
            },
        }
