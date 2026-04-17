"""Engine abstraction — dynamically imports from geny-executor or geny-harness."""

from __future__ import annotations
from typing import Literal

EngineType = Literal["executor", "harness"]


def get_engine_modules(engine: EngineType):
    """Return the appropriate module references for the given engine."""
    if engine == "harness":
        from geny_harness import Pipeline, PipelinePresets
        from geny_harness.events.types import PipelineEvent
        from geny_harness.session.manager import SessionManager
        from geny_harness.session.session import Session
    else:
        from geny_executor import Pipeline, PipelinePresets
        from geny_executor.events.types import PipelineEvent
        from geny_executor.session.manager import SessionManager
        from geny_executor.session.session import Session

    return {
        "Pipeline": Pipeline,
        "PipelinePresets": PipelinePresets,
        "PipelineEvent": PipelineEvent,
        "SessionManager": SessionManager,
        "Session": Session,
    }
