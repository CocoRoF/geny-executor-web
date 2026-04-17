"""/api/catalog — session-less artifact catalog for the Environment Builder.

These endpoints expose what stages and artifacts exist, their schemas, and
how they plug together — without requiring an active session. The UI uses
this to render the stage grid, artifact picker, and schema-driven config
forms before any pipeline has been created.
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request

from app.schemas.catalog import (
    ArtifactListResponse,
    FullCatalogResponse,
    StageListResponse,
)
from app.services.artifact_service import ArtifactError, ArtifactService

router = APIRouter(prefix="/api/catalog", tags=["catalog"])


def _service(request: Request) -> ArtifactService:
    return request.app.state.artifact_service


@router.get("/stages", response_model=StageListResponse)
async def list_stages(request: Request) -> StageListResponse:
    """Return the 16-stage summary list with per-stage artifact counts."""
    insps = _service(request).full_introspection()
    stages = []
    for insp in insps:
        artifacts = _service(request).list_for_stage(insp.order)
        stages.append(
            {
                "order": insp.order,
                "module": insp.stage,
                "name": insp.name,
                "category": insp.category,
                "default_artifact": insp.artifact,
                "artifact_count": len(artifacts),
            }
        )
    return StageListResponse(stages=stages)


@router.get("/stages/{order}")
async def describe_stage(request: Request, order: int) -> dict:
    """Return the default artifact's full introspection for *order*."""
    service = _service(request)
    try:
        # Use the cached full introspection rather than re-instantiating.
        insp = next((i for i in service.full_introspection() if i.order == order), None)
        if insp is None:
            raise ArtifactError(f"Unknown stage order: {order}")
        return insp.to_dict()
    except ArtifactError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.get("/stages/{order}/artifacts", response_model=ArtifactListResponse)
async def list_artifacts_route(request: Request, order: int) -> ArtifactListResponse:
    """Return every artifact available for *order*."""
    try:
        artifacts = _service(request).list_for_stage(order)
    except ArtifactError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    return ArtifactListResponse(
        stage=artifacts[0].stage if artifacts else "",
        artifacts=[a.to_dict() for a in artifacts],
    )


@router.get("/stages/{order}/artifacts/{name}")
async def describe_artifact_route(request: Request, order: int, name: str) -> dict:
    """Return the full introspection for one specific (order, artifact)."""
    try:
        insp = _service(request).describe_artifact_full(order, name)
    except ArtifactError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    return insp.to_dict()


@router.get("/full", response_model=FullCatalogResponse)
async def full_catalog(request: Request) -> FullCatalogResponse:
    """Return the default-artifact introspection for every stage in order."""
    insps = _service(request).full_introspection()
    return FullCatalogResponse(stages=[i.to_dict() for i in insps])
