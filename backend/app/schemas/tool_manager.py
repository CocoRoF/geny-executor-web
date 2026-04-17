"""Pydantic schemas for the Tool Manager API."""

from __future__ import annotations

from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel


# ── Requests ─────────────────────────────────────────────


class CreateAdhocToolRequest(BaseModel):
    name: str
    description: str
    input_schema: Dict[str, Any]
    executor_type: Literal["http", "script", "template", "composite"]
    http_config: Optional[Dict[str, Any]] = None
    script_config: Optional[Dict[str, Any]] = None
    template_config: Optional[Dict[str, Any]] = None
    composite_config: Optional[Dict[str, Any]] = None
    tags: List[str] = []


class TestToolRequest(BaseModel):
    input: Dict[str, Any]


class ConnectMCPRequest(BaseModel):
    name: str
    transport: Literal["stdio", "http", "sse"]
    command: Optional[str] = None
    args: List[str] = []
    url: Optional[str] = None
    headers: Dict[str, str] = {}
    env: Dict[str, str] = {}


class UpdateToolScopeRequest(BaseModel):
    global_scope: Optional[Dict[str, Any]] = None
    stage_scopes: Optional[Dict[int, Dict[str, Any]]] = None


class EnableToolRequest(BaseModel):
    enabled: bool


# ── Responses ────────────────────────────────────────────


class ToolInfoResponse(BaseModel):
    name: str
    description: str
    input_schema: Dict[str, Any]
    type: str  # "built_in" | "adhoc" | "mcp"
    source: str
    enabled: bool
    tags: List[str] = []
    definition: Optional[Dict[str, Any]] = None
    mcp_server: Optional[str] = None


class ToolListResponse(BaseModel):
    tools: List[ToolInfoResponse]


class ToolTestResultResponse(BaseModel):
    success: bool
    result: str
    is_error: bool
    execution_time_ms: float
    error: Optional[str] = None


class MCPServerResponse(BaseModel):
    name: str
    connected: bool
    transport: str
    tool_count: int
    tools: List[str] = []
    error: Optional[str] = None


class MCPServerListResponse(BaseModel):
    servers: List[MCPServerResponse]


class ToolPresetResponse(BaseModel):
    name: str
    description: str
    tools: List[str]
    tags: List[str] = []


class ToolPresetListResponse(BaseModel):
    presets: List[ToolPresetResponse]


class ToolScopeResponse(BaseModel):
    global_scope: Dict[str, Any]
    stage_scopes: Dict[int, Dict[str, Any]]
