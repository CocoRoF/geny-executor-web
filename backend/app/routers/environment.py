"""Environment CRUD API — v2 template extensions.

v0.8.0 adds first-class template endpoints: blank/preset creation, whole-
manifest PUT, per-stage PATCH, and duplicate. The legacy session-save POST
survives as ``mode='from_session'`` for existing callers.
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request

from app.schemas.environment import (
    CreateEnvironmentRequest,
    CreateEnvironmentResponse,
    DiffEntry,
    DiffEnvironmentsRequest,
    DuplicateEnvironmentRequest,
    EnvironmentDetailResponse,
    EnvironmentDiffResponse,
    EnvironmentListResponse,
    EnvironmentSummaryResponse,
    ImportEnvironmentRequest,
    SaveEnvironmentRequest,
    ShareLinkResponse,
    UpdateEnvironmentRequest,
    UpdateManifestRequest,
    UpdateStageTemplateRequest,
)
from app.services.exceptions import EnvironmentNotFoundError

router = APIRouter(prefix="/api/environments", tags=["environments"])


def _env_svc(request: Request):
    return request.app.state.environment_service


def _detail_response(data: dict) -> EnvironmentDetailResponse:
    return EnvironmentDetailResponse(
        id=data["id"],
        name=data.get("name", ""),
        description=data.get("description", ""),
        tags=data.get("tags", []),
        created_at=data.get("created_at", ""),
        updated_at=data.get("updated_at", ""),
        manifest=data.get("manifest"),
        snapshot=data.get("snapshot"),
    )


# ── CRUD ─────────────────────────────────────────────────


@router.get("", response_model=EnvironmentListResponse)
async def list_environments(request: Request):
    envs = _env_svc(request).list_all()
    return EnvironmentListResponse(
        environments=[EnvironmentSummaryResponse(**e) for e in envs]
    )


@router.post("", response_model=CreateEnvironmentResponse)
async def create_environment(request: Request, body: CreateEnvironmentRequest):
    """Create a new environment in one of three modes."""
    svc = _env_svc(request)

    if body.mode == "from_session":
        session = request.app.state.session_service.get(body.session_id)
        if session is None:
            raise HTTPException(404, "Session not found")
        mutator = request.app.state.mutation_service.get_or_create(session)
        env_id = svc.save(session, mutator, body.name, body.description, body.tags)
        return CreateEnvironmentResponse(id=env_id)

    if body.mode == "from_preset":
        try:
            env_id = svc.create_from_preset(
                body.preset_name, body.name, body.description, body.tags
            )
        except ValueError as exc:
            raise HTTPException(400, str(exc))
        return CreateEnvironmentResponse(id=env_id)

    # mode == "blank" — preset_name is optional; if present, seed from preset
    try:
        env_id = svc.create_blank(
            body.name, body.description, body.tags, base_preset=body.preset_name
        )
    except ValueError as exc:
        raise HTTPException(400, str(exc))
    return CreateEnvironmentResponse(id=env_id)


# Back-compat alias: old callers posted to /api/environments with the
# session-only payload. Keep that entry point alive without a breaking change.
@router.post("/from-session", response_model=CreateEnvironmentResponse)
async def save_from_session(request: Request, body: SaveEnvironmentRequest):
    session = request.app.state.session_service.get(body.session_id)
    if session is None:
        raise HTTPException(404, "Session not found")
    mutator = request.app.state.mutation_service.get_or_create(session)
    env_id = _env_svc(request).save(
        session, mutator, body.name, body.description, body.tags
    )
    return CreateEnvironmentResponse(id=env_id)


@router.get("/{env_id}", response_model=EnvironmentDetailResponse)
async def get_environment(request: Request, env_id: str):
    data = _env_svc(request).load(env_id)
    if data is None:
        raise HTTPException(404, "Environment not found")
    return _detail_response(data)


@router.put("/{env_id}")
async def update_environment(
    request: Request, env_id: str, body: UpdateEnvironmentRequest
):
    updated = _env_svc(request).update(env_id, body.model_dump(exclude_none=True))
    if updated is None:
        raise HTTPException(404, "Environment not found")
    return {"updated": True}


@router.put("/{env_id}/manifest", response_model=EnvironmentDetailResponse)
async def replace_manifest(request: Request, env_id: str, body: UpdateManifestRequest):
    """Overwrite the manifest payload wholesale (template editor save)."""
    # Import locally so the router module stays importable in environments
    # (e.g. unit tests with fake services) that don't have geny_executor.
    try:
        from geny_executor import EnvironmentManifest

        manifest = EnvironmentManifest.from_dict(body.manifest)
    except ImportError:
        # Fallback: pass the raw dict; the fake service accepts dicts too.
        manifest = body.manifest
    except Exception as exc:  # noqa: BLE001 — surface any parse error as 400
        raise HTTPException(400, f"Invalid manifest: {exc}")
    try:
        record = _env_svc(request).update_manifest(env_id, manifest)
    except EnvironmentNotFoundError:
        raise HTTPException(404, "Environment not found")
    return _detail_response(record)


@router.patch("/{env_id}/stages/{order}", response_model=EnvironmentDetailResponse)
async def patch_stage(
    request: Request,
    env_id: str,
    order: int,
    body: UpdateStageTemplateRequest,
):
    """Partial update of one stage entry inside the manifest."""
    try:
        record = _env_svc(request).update_stage(
            env_id, order, **body.model_dump(exclude_none=True)
        )
    except EnvironmentNotFoundError:
        raise HTTPException(404, "Environment not found")
    except ValueError as exc:
        raise HTTPException(400, str(exc))
    return _detail_response(record)


@router.post("/{env_id}/duplicate", response_model=CreateEnvironmentResponse)
async def duplicate_environment(
    request: Request, env_id: str, body: DuplicateEnvironmentRequest
):
    new_id = _env_svc(request).duplicate(env_id, body.new_name)
    if new_id is None:
        raise HTTPException(404, "Environment not found")
    return CreateEnvironmentResponse(id=new_id)


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


@router.post("/import", response_model=CreateEnvironmentResponse)
async def import_environment(request: Request, body: ImportEnvironmentRequest):
    env_id = _env_svc(request).import_json(body.data)
    return CreateEnvironmentResponse(id=env_id)


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
    base_url = str(request.base_url).rstrip("/")
    url = f"{base_url}/api/environments/{env_id}/export"
    return ShareLinkResponse(url=url)
