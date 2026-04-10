"""Pipeline metadata endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Request

from app.schemas.pipeline import PipelineDescribeResponse, PresetsListResponse

router = APIRouter(prefix="/api/pipeline", tags=["pipeline"])


@router.get("/describe", response_model=PipelineDescribeResponse)
async def describe_pipeline(request: Request, preset: str = "agent", engine: str = "executor"):
    pipeline_service = request.app.state.pipeline_service
    return pipeline_service.describe_pipeline(preset, engine=engine)


@router.get("/presets", response_model=PresetsListResponse)
async def list_presets(request: Request, engine: str = "executor"):
    pipeline_service = request.app.state.pipeline_service
    return {"presets": pipeline_service.get_presets(engine=engine)}
