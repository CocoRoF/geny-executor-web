"""Stage Editor API — pipeline mutation endpoints."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request

from app.schemas.stage_editor import (
    MutationLogResponse,
    MutationRecordResponse,
    MutationResultResponse,
    SetActiveRequest,
    StageDetailResponse,
    StagesResponse,
    StrategyDetailResponse,
    SwapStrategyRequest,
    UpdateConfigRequest,
    UpdateModelRequest,
    UpdatePipelineConfigRequest,
)

router = APIRouter(prefix="/api/sessions/{session_id}", tags=["stage-editor"])


# ── Helpers ──────────────────────────────────────────────


def _get_session(request: Request, session_id: str):
    session = request.app.state.session_service.get(session_id)
    if session is None:
        raise HTTPException(404, "Session not found")
    return session


def _get_mutator(request: Request, session):
    return request.app.state.mutation_service.get_or_create(session)


def _stage_to_detail(stage) -> StageDetailResponse:
    """Convert a Stage object to StageDetailResponse."""
    strategies = []
    for slot_name, slot in stage.get_strategy_slots().items():
        schema = {}
        if slot.strategy and hasattr(slot.strategy, "config_schema"):
            cs = slot.strategy.__class__.config_schema()
            if cs is not None:
                schema = cs.to_json_schema()

        impl_descs = {}
        for impl_name, impl_cls in slot.registry.items():
            impl_descs[impl_name] = getattr(impl_cls, "description", "") or impl_name

        strategies.append(
            StrategyDetailResponse(
                slot_name=slot_name,
                current_impl=slot.current_impl,
                available_impls=slot.available_impls,
                config=slot.strategy.get_config() if slot.strategy else {},
                config_schema=schema,
                impl_descriptions=impl_descs,
            )
        )

    stage_schema = {}
    cs = stage.get_config_schema()
    if cs is not None:
        stage_schema = cs.to_json_schema()

    return StageDetailResponse(
        name=stage.name,
        order=stage.order,
        category=stage.category,
        is_active=True,
        strategies=strategies,
        config_schema=stage_schema,
        current_config=stage.get_config(),
    )


def _description_to_detail(desc) -> StageDetailResponse:
    """Convert a StageDescription (from pipeline.describe()) to response."""
    strategies = []
    for s in desc.strategies:
        strategies.append(
            StrategyDetailResponse(
                slot_name=s.slot_name,
                current_impl=s.current_impl,
                available_impls=s.available_impls,
                config=s.config,
                config_schema={},
                impl_descriptions={},
            )
        )
    return StageDetailResponse(
        name=desc.name,
        order=desc.order,
        category=desc.category,
        is_active=desc.is_active,
        strategies=strategies,
        config_schema={},
        current_config={},
    )


def _mutation_response(result, stage=None) -> MutationResultResponse:
    record = result.record
    updated = None
    if stage is not None:
        try:
            updated = _stage_to_detail(stage)
        except Exception:
            pass

    return MutationResultResponse(
        success=result.success,
        message=result.message,
        mutation_type=record.kind.value if record else "unknown",
        details={
            "target": record.target if record else "",
            "old_value": str(record.old_value) if record else "",
            "new_value": str(record.new_value) if record else "",
        },
        updated_stage=updated,
    )


# ── Endpoints ────────────────────────────────────────────


@router.get("/stages", response_model=StagesResponse)
async def list_stages(request: Request, session_id: str):
    session = _get_session(request, session_id)
    descriptions = session.pipeline.describe()
    stages = []
    for desc in descriptions:
        stage_obj = session.pipeline.get_stage(desc.order)
        if stage_obj is not None:
            stages.append(_stage_to_detail(stage_obj))
        else:
            stages.append(_description_to_detail(desc))
    return StagesResponse(stages=stages)


@router.get("/stages/{order}", response_model=StageDetailResponse)
async def get_stage(request: Request, session_id: str, order: int):
    session = _get_session(request, session_id)
    stage = session.pipeline.get_stage(order)
    if stage is None:
        # Return a minimal inactive stage from describe()
        for desc in session.pipeline.describe():
            if desc.order == order:
                return _description_to_detail(desc)
        raise HTTPException(404, f"Stage {order} not found")
    return _stage_to_detail(stage)


@router.patch("/stages/{order}/strategy", response_model=MutationResultResponse)
async def swap_strategy(
    request: Request, session_id: str, order: int, body: SwapStrategyRequest
):
    session = _get_session(request, session_id)
    mutator = _get_mutator(request, session)
    try:
        result = mutator.swap_strategy(
            stage_order=order,
            slot_name=body.slot_name,
            impl_name=body.new_impl,
            config=body.config,
        )
    except Exception as e:
        raise HTTPException(400, str(e))

    stage = session.pipeline.get_stage(order)
    resp = _mutation_response(result, stage)

    # Broadcast via editor sync if available
    sync = getattr(request.app.state, "editor_sync", None)
    if sync:
        await sync.broadcast_mutation(session_id, resp.model_dump())

    return resp


@router.patch("/stages/{order}/config", response_model=MutationResultResponse)
async def update_stage_config(
    request: Request, session_id: str, order: int, body: UpdateConfigRequest
):
    session = _get_session(request, session_id)
    mutator = _get_mutator(request, session)
    try:
        result = mutator.update_stage_config(stage_order=order, config=body.config)
    except Exception as e:
        raise HTTPException(400, str(e))

    stage = session.pipeline.get_stage(order)
    resp = _mutation_response(result, stage)

    sync = getattr(request.app.state, "editor_sync", None)
    if sync:
        await sync.broadcast_mutation(session_id, resp.model_dump())

    return resp


@router.patch("/stages/{order}/active", response_model=MutationResultResponse)
async def set_stage_active(
    request: Request, session_id: str, order: int, body: SetActiveRequest
):
    session = _get_session(request, session_id)
    mutator = _get_mutator(request, session)
    try:
        result = mutator.set_stage_active(stage_order=order, active=body.active)
    except Exception as e:
        raise HTTPException(400, str(e))

    stage = session.pipeline.get_stage(order)
    return _mutation_response(result, stage)


@router.patch("/model", response_model=MutationResultResponse)
async def update_model_config(
    request: Request, session_id: str, body: UpdateModelRequest
):
    session = _get_session(request, session_id)
    mutator = _get_mutator(request, session)
    changes = body.model_dump(exclude_none=True)
    if not changes:
        raise HTTPException(400, "No changes provided")
    try:
        result = mutator.update_model_config(changes)
    except Exception as e:
        raise HTTPException(400, str(e))
    return _mutation_response(result)


@router.patch("/pipeline-config", response_model=MutationResultResponse)
async def update_pipeline_config(
    request: Request, session_id: str, body: UpdatePipelineConfigRequest
):
    session = _get_session(request, session_id)
    mutator = _get_mutator(request, session)
    changes = body.model_dump(exclude_none=True)
    if not changes:
        raise HTTPException(400, "No changes provided")
    try:
        result = mutator.update_pipeline_config(changes)
    except Exception as e:
        raise HTTPException(400, str(e))
    return _mutation_response(result)


@router.get("/mutations", response_model=MutationLogResponse)
async def get_mutation_log(request: Request, session_id: str):
    session = _get_session(request, session_id)
    mutator = _get_mutator(request, session)
    records = mutator.get_change_log()
    return MutationLogResponse(
        mutations=[
            MutationRecordResponse(
                timestamp=r.timestamp.isoformat()
                if hasattr(r.timestamp, "isoformat")
                else str(r.timestamp),
                mutation_type=r.kind.value,
                target=r.target,
                details={
                    "old_value": str(r.old_value),
                    "new_value": str(r.new_value),
                },
            )
            for r in records
        ]
    )


@router.post("/snapshot")
async def create_snapshot(request: Request, session_id: str):
    session = _get_session(request, session_id)
    mutator = _get_mutator(request, session)
    snapshot = mutator.snapshot(description=f"Manual snapshot for {session_id}")
    return snapshot.to_dict()


@router.post("/restore")
async def restore_snapshot(request: Request, session_id: str, body: dict):
    from geny_executor.core.snapshot import PipelineSnapshot

    session = _get_session(request, session_id)
    mutator = _get_mutator(request, session)
    try:
        snapshot = PipelineSnapshot.from_dict(body)
        result = mutator.restore(snapshot)
    except Exception as e:
        raise HTTPException(400, str(e))
    return _mutation_response(result)
