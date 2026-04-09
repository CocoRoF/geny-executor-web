"""Session management service wrapping geny-executor's SessionManager."""

from __future__ import annotations

from typing import AsyncIterator

from geny_executor.core.pipeline import Pipeline
from geny_executor.events.types import PipelineEvent
from geny_executor.session.manager import SessionManager
from geny_executor.session.session import Session


class SessionService:
    """Wraps SessionManager with preset tracking."""

    def __init__(self) -> None:
        """Initialize with an empty SessionManager and preset map."""
        self._manager = SessionManager()
        self._presets: dict[str, str] = {}  # session_id -> preset name

    def create(self, pipeline: Pipeline, preset: str) -> Session:
        """Create a new session from a pipeline and record its preset."""
        session = self._manager.create(pipeline)
        self._presets[session.id] = preset
        return session

    def get(self, session_id: str) -> Session | None:
        """Return session by ID, or None if not found."""
        return self._manager.get(session_id)

    def get_preset(self, session_id: str) -> str:
        """Return the preset name used to create this session."""
        return self._presets.get(session_id, "unknown")

    def delete(self, session_id: str) -> bool:
        """Delete a session and remove its preset record. Returns True if existed."""
        self._presets.pop(session_id, None)
        return self._manager.delete(session_id)

    def list_all(self) -> list[dict]:
        """Return summary dicts for all active sessions."""
        result = []
        for info in self._manager.list_sessions():
            result.append(
                {
                    "session_id": info.session_id,
                    "preset": self._presets.get(info.session_id, "unknown"),
                    "freshness": info.freshness,
                    "message_count": info.message_count,
                    "iteration": info.iteration,
                    "total_cost_usd": info.total_cost_usd,
                }
            )
        return result

    async def run_stream(self, session_id: str, input_text: str) -> AsyncIterator[PipelineEvent]:
        """Stream pipeline execution events, enriching pipeline.complete with token data."""
        session = self._manager.get(session_id)
        if session is None:
            raise ValueError(f"Session not found: {session_id}")

        async for event in session.run_stream(input_text):
            # Enrich pipeline.complete with token usage and cost from session state
            if event.type == "pipeline.complete":
                state = session.state
                event.data.update(
                    {
                        "total_cost_usd": state.total_cost_usd,
                        "model": state.model,
                        "input_tokens": state.token_usage.input_tokens,
                        "output_tokens": state.token_usage.output_tokens,
                        "cache_creation_input_tokens": state.token_usage.cache_creation_input_tokens,
                        "cache_read_input_tokens": state.token_usage.cache_read_input_tokens,
                    }
                )
            yield event

    async def run(self, session_id: str, input_text: str) -> dict:
        """Run pipeline to completion and return result dict with token usage."""
        session = self._manager.get(session_id)
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
