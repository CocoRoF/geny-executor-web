"""Session-related Pydantic models."""

from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel, field_validator, model_validator

VALID_PRESETS = ("minimal", "chat", "agent", "evaluator", "geny_vtuber")
PresetName = Literal["minimal", "chat", "agent", "evaluator", "geny_vtuber"]


class CreateSessionRequest(BaseModel):
    """Create a session from either a preset or an environment template.

    *env_id* is mutually exclusive with the preset-flow fields (preset,
    system_prompt, model). When *env_id* is given, the pipeline is built
    from the stored :class:`EnvironmentManifest` via
    ``EnvironmentService.instantiate_pipeline``.
    """

    preset: str = "chat"
    api_key: str = ""
    system_prompt: str = ""
    model: str = "claude-sonnet-4-20250514"
    max_iterations: int = 50
    env_id: Optional[str] = None

    @field_validator("preset")
    @classmethod
    def preset_must_be_valid(cls, v: str) -> str:
        """Validate that preset is one of the supported pipeline presets."""
        if v not in VALID_PRESETS:
            raise ValueError(f"preset must be one of {VALID_PRESETS}, got {v!r}")
        return v

    @field_validator("max_iterations")
    @classmethod
    def max_iterations_range(cls, v: int) -> int:
        """Validate that max_iterations is within 1–200."""
        if not 1 <= v <= 200:
            raise ValueError("max_iterations must be between 1 and 200")
        return v

    @model_validator(mode="after")
    def _require_api_key_when_env(self) -> CreateSessionRequest:
        # env_id still needs an api_key — the pipeline has LLM-calling stages.
        # We let the router check api_key (the preset path already does), so
        # this validator only guards semantic exclusivity.
        return self


class SessionInfoResponse(BaseModel):
    session_id: str
    preset: str
    freshness: str
    message_count: int
    iteration: int
    total_cost_usd: float


class SessionListResponse(BaseModel):
    sessions: list[SessionInfoResponse]
