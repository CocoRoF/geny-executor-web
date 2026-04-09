"""Pipeline-related Pydantic models."""

from __future__ import annotations

from pydantic import BaseModel


class StrategyInfoResponse(BaseModel):
    slot_name: str
    current_impl: str
    available_impls: list[str] = []
    config: dict = {}


class StageDescriptionResponse(BaseModel):
    name: str
    order: int
    category: str
    is_active: bool = True
    strategies: list[StrategyInfoResponse] = []


class PipelineDescribeResponse(BaseModel):
    name: str
    stages: list[StageDescriptionResponse]


class PresetInfoResponse(BaseModel):
    name: str
    description: str
    active_stages: list[int]


class PresetsListResponse(BaseModel):
    presets: list[PresetInfoResponse]
