"""Pydantic schemas for the Environment CRUD API."""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from pydantic import BaseModel


# ── Requests ─────────────────────────────────────────────


class SaveEnvironmentRequest(BaseModel):
    session_id: str
    name: str
    description: str = ""
    tags: List[str] = []


class UpdateEnvironmentRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    tags: Optional[List[str]] = None


class DiffEnvironmentsRequest(BaseModel):
    env_id_a: str
    env_id_b: str


class ImportEnvironmentRequest(BaseModel):
    data: Dict[str, Any]


# ── Responses ────────────────────────────────────────────


class EnvironmentSummaryResponse(BaseModel):
    id: str
    name: str
    description: str
    tags: List[str]
    created_at: str
    updated_at: str
    stage_count: int
    model: str


class EnvironmentDetailResponse(BaseModel):
    id: str
    name: str
    description: str
    tags: List[str]
    created_at: str
    updated_at: str
    snapshot: Dict[str, Any]


class EnvironmentListResponse(BaseModel):
    environments: List[EnvironmentSummaryResponse]


class DiffEntry(BaseModel):
    path: str
    change_type: str  # "added" | "removed" | "changed"
    old_value: Optional[Any] = None
    new_value: Optional[Any] = None


class EnvironmentDiffResponse(BaseModel):
    identical: bool
    entries: List[DiffEntry]
    summary: Dict[str, int]  # {"added": n, "removed": n, "changed": n}


# ── Preset schemas ───────────────────────────────────────


class PresetInfoResponse(BaseModel):
    name: str
    description: str
    preset_type: str  # "built_in" | "user"
    tags: List[str] = []
    environment_id: Optional[str] = None


class PresetListResponse(BaseModel):
    presets: List[PresetInfoResponse]


# ── Share schemas ────────────────────────────────────────


class ShareLinkResponse(BaseModel):
    url: str
