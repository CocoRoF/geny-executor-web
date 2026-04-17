"""Mutation service — manages PipelineMutator instances per session."""

from __future__ import annotations

from typing import Dict, Optional

from geny_executor.core.mutation import PipelineMutator


class MutationService:
    """Manages one PipelineMutator per session."""

    def __init__(self) -> None:
        self._mutators: Dict[str, PipelineMutator] = {}

    def get_or_create(self, session) -> PipelineMutator:
        """Return existing or create new PipelineMutator for a session."""
        if session.id not in self._mutators:
            self._mutators[session.id] = PipelineMutator(session.pipeline)
        return self._mutators[session.id]

    def get(self, session_id: str) -> Optional[PipelineMutator]:
        return self._mutators.get(session_id)

    def remove(self, session_id: str) -> None:
        self._mutators.pop(session_id, None)
