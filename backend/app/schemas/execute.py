"""Execution-related Pydantic models."""

from __future__ import annotations

from pydantic import BaseModel, field_validator


class ExecuteRequest(BaseModel):
    input: str

    @field_validator("input")
    @classmethod
    def input_not_empty(cls, v: str) -> str:
        """Validate that input is non-empty and within size limits."""
        v = v.strip()
        if not v:
            raise ValueError("Input must not be empty")
        if len(v) > 50_000:
            raise ValueError("Input exceeds maximum length of 50,000 characters")
        return v


class PipelineEventResponse(BaseModel):
    type: str
    stage: str = ""
    iteration: int = 0
    timestamp: str = ""
    data: dict = {}


class TokenUsageResponse(BaseModel):
    input_tokens: int = 0
    output_tokens: int = 0
    cache_creation_input_tokens: int = 0
    cache_read_input_tokens: int = 0


class PipelineResultResponse(BaseModel):
    success: bool
    text: str = ""
    error: str = ""
    iterations: int = 0
    total_cost_usd: float = 0.0
    model: str = ""
    token_usage: TokenUsageResponse = TokenUsageResponse()
