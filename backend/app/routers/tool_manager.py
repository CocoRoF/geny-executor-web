"""Tool Manager API — tool CRUD, MCP, presets, scope."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request

from app.schemas.tool_manager import (
    ConnectMCPRequest,
    CreateAdhocToolRequest,
    MCPServerListResponse,
    MCPServerResponse,
    TestToolRequest,
    ToolInfoResponse,
    ToolListResponse,
    ToolPresetListResponse,
    ToolPresetResponse,
    ToolScopeResponse,
    ToolTestResultResponse,
    UpdateToolScopeRequest,
)

router = APIRouter(prefix="/api/sessions/{session_id}", tags=["tool-manager"])


def _get_session(request: Request, session_id: str):
    session = request.app.state.session_service.get(session_id)
    if session is None:
        raise HTTPException(404, "Session not found")
    return session


def _tool_svc(request: Request):
    return request.app.state.tool_service


def _info_to_response(info) -> ToolInfoResponse:
    return ToolInfoResponse(
        name=info.name,
        description=info.description,
        input_schema=info.input_schema,
        type=info.type,
        source=info.source,
        enabled=info.enabled,
        tags=info.tags or [],
        definition=info.definition,
        mcp_server=info.mcp_server,
    )


# ── Tool CRUD ────────────────────────────────────────────


@router.get("/tools", response_model=ToolListResponse)
async def list_tools(request: Request, session_id: str):
    session = _get_session(request, session_id)
    infos = _tool_svc(request).list_tools(session)
    return ToolListResponse(tools=[_info_to_response(i) for i in infos])


@router.get("/tools/{tool_name}", response_model=ToolInfoResponse)
async def get_tool(request: Request, session_id: str, tool_name: str):
    session = _get_session(request, session_id)
    info = _tool_svc(request).get_tool(session, tool_name)
    if info is None:
        raise HTTPException(404, f"Tool not found: {tool_name}")
    return _info_to_response(info)


@router.delete("/tools/{tool_name}")
async def remove_tool(request: Request, session_id: str, tool_name: str):
    session = _get_session(request, session_id)
    removed = _tool_svc(request).remove_adhoc_tool(session, tool_name)
    if not removed:
        raise HTTPException(404, f"Ad-hoc tool not found: {tool_name}")
    return {"deleted": True}


@router.post("/tools/{tool_name}/test", response_model=ToolTestResultResponse)
async def test_tool(
    request: Request, session_id: str, tool_name: str, body: TestToolRequest
):
    session = _get_session(request, session_id)
    result = await _tool_svc(request).test_tool(session, tool_name, body.input)
    return ToolTestResultResponse(**result)


# ── Ad-hoc Tools ─────────────────────────────────────────


@router.post("/tools/adhoc", response_model=ToolInfoResponse)
async def create_adhoc_tool(
    request: Request, session_id: str, body: CreateAdhocToolRequest
):
    session = _get_session(request, session_id)
    try:
        info = _tool_svc(request).create_adhoc_tool(session, body.model_dump())
    except Exception as e:
        raise HTTPException(400, str(e))
    return _info_to_response(info)


@router.put("/tools/adhoc/{tool_name}", response_model=ToolInfoResponse)
async def update_adhoc_tool(
    request: Request, session_id: str, tool_name: str, body: CreateAdhocToolRequest
):
    session = _get_session(request, session_id)
    svc = _tool_svc(request)
    svc.remove_adhoc_tool(session, tool_name)
    try:
        info = svc.create_adhoc_tool(session, body.model_dump())
    except Exception as e:
        raise HTTPException(400, str(e))
    return _info_to_response(info)


# ── Presets ──────────────────────────────────────────────


@router.get("/tool-presets", response_model=ToolPresetListResponse)
async def list_presets(request: Request, session_id: str):
    session = _get_session(request, session_id)
    presets = _tool_svc(request).list_presets(session)
    return ToolPresetListResponse(
        presets=[
            ToolPresetResponse(
                name=p.name,
                description=p.description or "",
                tools=p.tools,
                tags=p.tags or [],
            )
            for p in presets
        ]
    )


@router.post("/tool-presets/{preset_name}")
async def apply_preset(request: Request, session_id: str, preset_name: str):
    session = _get_session(request, session_id)
    try:
        registry = _tool_svc(request).apply_preset(session, preset_name)
    except Exception as e:
        raise HTTPException(400, str(e))
    return {"applied": preset_name, "tool_count": len(registry)}


# ── MCP Servers ──────────────────────────────────────────


@router.get("/mcp-servers", response_model=MCPServerListResponse)
async def list_mcp_servers(request: Request, session_id: str):
    _get_session(request, session_id)
    # MCP manager is global, not per-session in current architecture
    mcp = getattr(request.app.state, "mcp_manager", None)
    if mcp is None:
        return MCPServerListResponse(servers=[])
    statuses = mcp.list_server_status()
    return MCPServerListResponse(
        servers=[
            MCPServerResponse(
                name=s["name"],
                connected=s["connected"],
                transport=s.get("transport", "unknown"),
                tool_count=s.get("tool_count", 0),
            )
            for s in statuses
        ]
    )


@router.post("/mcp-servers", response_model=MCPServerResponse)
async def connect_mcp_server(
    request: Request, session_id: str, body: ConnectMCPRequest
):
    _get_session(request, session_id)
    mcp = getattr(request.app.state, "mcp_manager", None)
    if mcp is None:
        raise HTTPException(501, "MCP manager not available")
    try:
        tools = await mcp.add_server(body.model_dump())
    except Exception as e:
        raise HTTPException(400, str(e))
    return MCPServerResponse(
        name=body.name,
        connected=True,
        transport=body.transport,
        tool_count=len(tools),
        tools=[t.name for t in tools],
    )


@router.delete("/mcp-servers/{server_name}")
async def disconnect_mcp_server(request: Request, session_id: str, server_name: str):
    _get_session(request, session_id)
    mcp = getattr(request.app.state, "mcp_manager", None)
    if mcp is None:
        raise HTTPException(501, "MCP manager not available")
    removed = await mcp.remove_server(server_name)
    if not removed:
        raise HTTPException(404, f"MCP server not found: {server_name}")
    return {"deleted": True}


@router.post("/mcp-servers/{server_name}/test")
async def test_mcp_server(request: Request, session_id: str, server_name: str):
    _get_session(request, session_id)
    mcp = getattr(request.app.state, "mcp_manager", None)
    if mcp is None:
        raise HTTPException(501, "MCP manager not available")
    result = await mcp.test_connection({"name": server_name})
    return result


# ── Tool Scope ───────────────────────────────────────────


@router.get("/tool-scope", response_model=ToolScopeResponse)
async def get_tool_scope(request: Request, session_id: str):
    _get_session(request, session_id)
    scope = _tool_svc(request).get_scope(session_id)
    return ToolScopeResponse(
        global_scope=scope.get("global_scope", {}),
        stage_scopes=scope.get("stage_scopes", {}),
    )


@router.put("/tool-scope", response_model=ToolScopeResponse)
async def update_tool_scope(
    request: Request, session_id: str, body: UpdateToolScopeRequest
):
    _get_session(request, session_id)
    scope = _tool_svc(request).update_scope(
        session_id, body.global_scope, body.stage_scopes
    )
    return ToolScopeResponse(
        global_scope=scope.get("global_scope", {}),
        stage_scopes=scope.get("stage_scopes", {}),
    )
