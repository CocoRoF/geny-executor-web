"""History, analytics, and A/B test API schemas (Phase 6)."""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from pydantic import BaseModel


# ── Execution list / detail ──────────────────────────────


class ExecutionSummary(BaseModel):
    id: str
    session_id: str
    model: str = ""
    input_text: str = ""
    result_text: Optional[str] = None
    success: bool = True
    status: str = "completed"
    iterations: int = 0
    total_cost_usd: float = 0.0
    duration_ms: int = 0
    total_tokens: int = 0
    tool_call_count: int = 0
    environment_id: Optional[str] = None
    created_at: str = ""
    tags: List[str] = []


class ExecutionListResponse(BaseModel):
    runs: List[ExecutionSummary]
    total: int = 0


class StageTimingResponse(BaseModel):
    iteration: int
    stage_order: int
    stage_name: str
    started_at: str
    finished_at: str
    duration_ms: int
    input_tokens: int = 0
    output_tokens: int = 0
    was_cached: bool = False
    was_skipped: bool = False
    tool_name: Optional[str] = None
    tool_success: Optional[bool] = None
    tool_duration_ms: Optional[int] = None


class ToolCallResponse(BaseModel):
    iteration: int
    tool_name: str
    called_at: str
    input_json: Optional[str] = None
    output_text: Optional[str] = None
    is_error: bool = False
    duration_ms: int = 0


class ExecutionDetailResponse(BaseModel):
    id: str
    session_id: str
    model: str = ""
    input_text: str = ""
    result_text: Optional[str] = None
    success: bool = True
    status: str = "completed"
    iterations: int = 0
    total_cost_usd: float = 0.0
    duration_ms: int = 0
    total_tokens: int = 0
    input_tokens: int = 0
    output_tokens: int = 0
    cache_read_tokens: int = 0
    cache_write_tokens: int = 0
    thinking_tokens: int = 0
    tool_call_count: int = 0
    environment_id: Optional[str] = None
    error_type: Optional[str] = None
    error_message: Optional[str] = None
    error_stage: Optional[int] = None
    created_at: str = ""
    finished_at: Optional[str] = None
    tags: List[str] = []
    stage_timings: List[StageTimingResponse] = []
    tool_call_records: List[ToolCallResponse] = []


# ── Waterfall ────────────────────────────────────────────


class StageWaterfallResponse(BaseModel):
    order: int
    name: str
    duration_ms: int
    was_cached: bool = False
    was_skipped: bool = False
    tokens: int = 0


class IterationWaterfallResponse(BaseModel):
    iteration: int
    stages: List[StageWaterfallResponse] = []


class WaterfallResponse(BaseModel):
    execution_id: str
    total_duration_ms: int = 0
    iterations: List[IterationWaterfallResponse] = []


# ── Stage Stats ──────────────────────────────────────────


class StageStatsResponse(BaseModel):
    stage_order: int
    stage_name: str
    count: int
    avg_ms: float
    min_ms: float
    max_ms: float
    cache_hits: int = 0
    skips: int = 0
    avg_input_tokens: float = 0.0
    avg_output_tokens: float = 0.0


# ── Cost Analysis ────────────────────────────────────────


class ModelCostResponse(BaseModel):
    model: str
    executions: int = 0
    total_cost: float = 0.0
    total_tokens: int = 0
    total_input: int = 0
    total_output: int = 0
    total_cache_read: int = 0
    total_cache_write: int = 0
    total_thinking: int = 0
    total_tools: int = 0
    avg_cost: float = 0.0


class CostSummaryResponse(BaseModel):
    session_id: Optional[str] = None
    by_model: List[ModelCostResponse] = []
    total_cost: float = 0.0
    total_executions: int = 0


class CostTrendPointResponse(BaseModel):
    period: str
    executions: int = 0
    cost: float = 0.0
    tokens: int = 0


class CostTrendResponse(BaseModel):
    trend: List[CostTrendPointResponse] = []
    granularity: str = "hour"


# ── Stats ────────────────────────────────────────────────


class StatsResponse(BaseModel):
    total: int = 0
    completed: int = 0
    errors: int = 0
    total_cost: float = 0.0
    total_tokens: int = 0
    avg_duration_ms: float = 0.0


# ── A/B Test ─────────────────────────────────────────────


class ABTestRequest(BaseModel):
    env_a_id: str
    env_b_id: str
    user_input: str


class ABSideResponse(BaseModel):
    execution_id: str
    model: str = ""
    status: str = ""
    result_text: str = ""
    cost_usd: float = 0.0
    duration_ms: int = 0
    total_tokens: int = 0
    iterations: int = 0
    tool_calls: int = 0


class ABComparisonResponse(BaseModel):
    env_a: ABSideResponse
    env_b: ABSideResponse
    diff: Dict[str, Any] = {}
