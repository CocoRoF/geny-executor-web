"""Memory-related Pydantic models (REST surface for session memory)."""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class MemoryBackendInfo(BaseModel):
    layer: str
    backend: str


class MemoryDescriptorResponse(BaseModel):
    """Mirror of `MemoryDescriptor` trimmed for JSON.

    The `config` field is the factory config dict used to construct
    this session's provider (minus ``session_id``), so UI can round-
    trip it into a duplicate-session form. Backend ``location`` is
    omitted on purpose — it can contain Postgres credentials.
    """

    session_id: str
    provider: str
    version: str = ""
    scope: str
    layers: List[str] = Field(default_factory=list)
    capabilities: List[str]
    backends: List[MemoryBackendInfo]
    metadata: Dict[str, Any] = Field(default_factory=dict)
    config: Optional[Dict[str, Any]] = None


class MemoryRetrievalRequest(BaseModel):
    """Ad-hoc retrieval against the session's unified provider."""

    query: str = ""
    top_k: int = Field(default=5, ge=1, le=50)
    layers: Optional[List[str]] = None
    tags: Optional[List[str]] = None


class MemoryChunkPayload(BaseModel):
    key: str
    content: str
    source: str
    relevance_score: float
    metadata: Dict[str, Any] = Field(default_factory=dict)


class MemoryRetrievalResponse(BaseModel):
    chunks: List[MemoryChunkPayload]
