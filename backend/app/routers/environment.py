"""Environment CRUD API — enhanced for Phase 5."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request

from app.schemas.environment import (
    DiffEntry,
    DiffEnvironmentsRequest,
    EnvironmentDetailResponse,
    EnvironmentDiffResponse,
    EnvironmentListResponse,
    EnvironmentSummaryResponse,
    ImportEnvironmentRequest,
    PresetInfoResponse,
    PresetListResponse,
    SaveEnvironmentRequest,
    ShareLinkResponse,
    UpdateEnvironmentRequest,
)

router = APIRouter(prefix="/api/environments", tags=["environments"])


def _env_svc(request: Request):
    return request.app.state.environment_service


# ── CRUD ─────────────────────────────────────────────────


@router.get("", response_model=EnvironmentListResponse)
async def list_environments(request: Request):
    envs = _env_svc(request).list_all()
    return EnvironmentListResponse(
        environments=[EnvironmentSummaryResponse(**e) for e in envs]
    )


@router.post("")
async def save_environment(request: Request, body: SaveEnvironmentRequest):
    session = request.app.state.session_service.get(body.session_id)
    if session is None:
        raise HTTPException(404, "Session not found")
    mutator = request.app.state.mutation_service.get_or_create(session)
    env_id = _env_svc(request).save(
        session, mutator, body.name, body.description, body.tags
    )
    return {"id": env_id}


@router.get("/{env_id}", response_model=EnvironmentDetailResponse)
async def get_environment(request: Request, env_id: str):
    data = _env_svc(request).load(env_id)
    if data is None:
        raise HTTPException(404, "Environment not found")
    return EnvironmentDetailResponse(
        id=data["id"],
        name=data["name"],
        description=data.get("description", ""),
        tags=data.get("tags", []),
        created_at=data.get("created_at", ""),
        updated_at=data.get("updated_at", ""),
        snapshot=data.get("snapshot", {}),
    )


@router.put("/{env_id}")
async def update_environment(
    request: Request, env_id: str, body: UpdateEnvironmentRequest
):
    updated = _env_svc(request).update(env_id, body.model_dump(exclude_none=True))
    if updated is None:
        raise HTTPException(404, "Environment not found")
    return {"updated": True}


@router.delete("/{env_id}")
async def delete_environment(request: Request, env_id: str):
    deleted = _env_svc(request).delete(env_id)
    if not deleted:
        raise HTTPException(404, "Environment not found")
    return {"deleted": True}


@router.get("/{env_id}/export")
async def export_environment(request: Request, env_id: str):
    data = _env_svc(request).export_json(env_id)
    if data is None:
        raise HTTPException(404, "Environment not found")
    return {"data": data}


@router.post("/import")
async def import_environment(request: Request, body: ImportEnvironmentRequest):
    env_id = _env_svc(request).import_json(body.data)
    return {"id": env_id}


@router.post("/diff", response_model=EnvironmentDiffResponse)
async def diff_environments(request: Request, body: DiffEnvironmentsRequest):
    changes = _env_svc(request).diff(body.env_id_a, body.env_id_b)
    entries = [
        DiffEntry(
            path=c.get("path", c.get("key", "")),
            change_type=c.get("change_type", c.get("type", "changed")),
            old_value=c.get("old_value"),
            new_value=c.get("new_value"),
        )
        for c in changes
    ]
    summary = {"added": 0, "removed": 0, "changed": 0}
    for e in entries:
        summary[e.change_type] = summary.get(e.change_type, 0) + 1
    return EnvironmentDiffResponse(
        identical=len(entries) == 0,
        entries=entries,
        summary=summary,
    )


# ── Presets ──────────────────────────────────────────────


@router.post("/{env_id}/preset")
async def mark_as_preset(request: Request, env_id: str):
    env = _env_svc(request).load(env_id)
    if env is None:
        raise HTTPException(404, "Environment not found")
    tags = env.get("tags", [])
    if "preset" not in tags:
        tags.append("preset")
        _env_svc(request).update(env_id, {"tags": tags})
    return {"marked": True}


@router.delete("/{env_id}/preset")
async def unmark_preset(request: Request, env_id: str):
    env = _env_svc(request).load(env_id)
    if env is None:
        raise HTTPException(404, "Environment not found")
    tags = env.get("tags", [])
    if "preset" in tags:
        tags.remove("preset")
        _env_svc(request).update(env_id, {"tags": tags})
    return {"unmarked": True}


# ── Share ────────────────────────────────────────────────


@router.get("/{env_id}/share", response_model=ShareLinkResponse)
async def share_environment(request: Request, env_id: str):
    data = _env_svc(request).export_json(env_id)
    if data is None:
        raise HTTPException(404, "Environment not found")
    # Generate a download-based share URL (for large environments)
    base_url = str(request.base_url).rstrip("/")
    url = f"{base_url}/api/environments/{env_id}/export"
    return ShareLinkResponse(url=url)
