"""Pydantic schemas for the Stage Editor API."""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from pydantic import BaseModel


# ── Requests ─────────────────────────────────────────────


class SwapStrategyRequest(BaseModel):
    slot_name: str
    new_impl: str
    config: Optional[Dict[str, Any]] = None


class UpdateConfigRequest(BaseModel):
    config: Dict[str, Any]


class SetActiveRequest(BaseModel):
    active: bool


class UpdateModelRequest(BaseModel):
    model: Optional[str] = None
    max_tokens: Optional[int] = None
    temperature: Optional[float] = None
    top_p: Optional[float] = None
    top_k: Optional[int] = None
    thinking_enabled: Optional[bool] = None
    thinking_budget_tokens: Optional[int] = None


class UpdatePipelineConfigRequest(BaseModel):
    max_iterations: Optional[int] = None
    cost_budget_usd: Optional[float] = None
    context_window_budget: Optional[int] = None
    stream: Optional[bool] = None
    single_turn: Optional[bool] = None


# ── Responses ────────────────────────────────────────────


class StrategyDetailResponse(BaseModel):
    slot_name: str
    current_impl: str
    available_impls: List[str]
    config: Dict[str, Any]
    config_schema: Dict[str, Any]
    impl_descriptions: Dict[str, str]


class StageDetailResponse(BaseModel):
    name: str
    order: int
    category: str
    is_active: bool
    strategies: List[StrategyDetailResponse]
    config_schema: Dict[str, Any]
    current_config: Dict[str, Any]


class StagesResponse(BaseModel):
    stages: List[StageDetailResponse]


class MutationResultResponse(BaseModel):
    success: bool
    message: str
    mutation_type: str
    details: Dict[str, Any] = {}
    updated_stage: Optional[StageDetailResponse] = None


class MutationRecordResponse(BaseModel):
    timestamp: str
    mutation_type: str
    target: str
    details: Dict[str, Any] = {}


class MutationLogResponse(BaseModel):
    mutations: List[MutationRecordResponse]
