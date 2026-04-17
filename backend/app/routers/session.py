"""Session CRUD endpoints."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request

from app.config import settings
from app.schemas.session import CreateSessionRequest, SessionListResponse
from app.services.exceptions import EnvironmentNotFoundError

router = APIRouter(prefix="/api/sessions", tags=["sessions"])


@router.post("")
async def create_session(request: Request, body: CreateSessionRequest):
    pipeline_service = request.app.state.pipeline_service
    session_service = request.app.state.session_service

    api_key = body.api_key or settings.default_api_key
    if not api_key:
        raise HTTPException(status_code=400, detail="API key required")

    # env_id path — build the pipeline from the stored manifest and register
    # the session under a synthetic "env:<id>" preset label so list_sessions
    # can tell the difference from preset-backed sessions.
    if body.env_id:
        env_service = request.app.state.environment_service
        try:
            pipeline = env_service.instantiate_pipeline(body.env_id, api_key=api_key)
        except EnvironmentNotFoundError:
            raise HTTPException(status_code=404, detail="Environment not found")
        except Exception as exc:  # noqa: BLE001 — surface bad manifest as 400
            raise HTTPException(
                status_code=400, detail=f"Failed to build pipeline: {exc}"
            )
        preset_label = f"env:{body.env_id}"
        session = session_service.create(pipeline, preset=preset_label)
        return {
            "session_id": session.id,
            "preset": preset_label,
            "env_id": body.env_id,
        }

    # Preset path — the legacy flow.
    pipeline = pipeline_service.create_pipeline(
        preset=body.preset,
        api_key=api_key,
        system_prompt=body.system_prompt,
        model=body.model,
        max_iterations=body.max_iterations,
    )
    session = session_service.create(pipeline, preset=body.preset)

    return {"session_id": session.id, "preset": body.preset}


@router.get("", response_model=SessionListResponse)
async def list_sessions(request: Request):
    session_service = request.app.state.session_service
    return {"sessions": session_service.list_all()}


@router.get("/{session_id}")
async def get_session(request: Request, session_id: str):
    session_service = request.app.state.session_service
    pipeline_service = request.app.state.pipeline_service

    session = session_service.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    preset = session_service.get_preset(session_id)
    desc = pipeline_service.describe_pipeline(preset)

    return {
        "session_id": session.id,
        "preset": preset,
        "freshness": session.freshness.value,
        "message_count": len(session.state.messages),
        "iteration": session.state.iteration,
        "total_cost_usd": session.state.total_cost_usd,
        "pipeline": desc,
    }


@router.delete("/{session_id}")
async def delete_session(request: Request, session_id: str):
    session_service = request.app.state.session_service
    deleted = session_service.delete(session_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"deleted": True}
