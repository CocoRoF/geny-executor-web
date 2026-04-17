"""Execution history, analytics, and A/B test API (Phase 6 enhanced)."""

from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, HTTPException, Request

from app.schemas.history import (
    ABComparisonResponse,
    ABTestRequest,
    CostSummaryResponse,
    CostTrendResponse,
    CostTrendPointResponse,
    ExecutionDetailResponse,
    ExecutionListResponse,
    ExecutionSummary,
    ModelCostResponse,
    StageStatsResponse,
    StatsResponse,
    WaterfallResponse,
)

router = APIRouter(prefix="/api", tags=["history"])


def _history_svc(request: Request):
    return request.app.state.history_service


# ── Session-scoped history ───────────────────────────────


@router.get("/sessions/{session_id}/history", response_model=ExecutionListResponse)
async def list_session_history(
    request: Request,
    session_id: str,
    limit: int = 50,
    offset: int = 0,
    model: Optional[str] = None,
    status: Optional[str] = None,
):
    svc = _history_svc(request)
    runs = svc.list_runs(
        session_id=session_id, model=model, status=status, limit=limit, offset=offset
    )
    total = svc.count_runs(session_id=session_id, model=model, status=status)
    return ExecutionListResponse(
        runs=[ExecutionSummary(**_normalize(r)) for r in runs],
        total=total,
    )


@router.get(
    "/sessions/{session_id}/history/{run_id}", response_model=ExecutionDetailResponse
)
async def get_run(request: Request, session_id: str, run_id: str):
    run = _history_svc(request).get_detail(run_id)
    if run is None or run.get("session_id") != session_id:
        raise HTTPException(404, "Run not found")
    return ExecutionDetailResponse(**_normalize_detail(run))


@router.get("/sessions/{session_id}/history/{run_id}/events")
async def get_run_events(request: Request, session_id: str, run_id: str):
    events = _history_svc(request).get_events(run_id)
    return {"events": events}


@router.get("/sessions/{session_id}/history/{run_id}/export")
async def export_run(request: Request, session_id: str, run_id: str):
    data = _history_svc(request).export_run(run_id)
    if data is None or data.get("session_id") != session_id:
        raise HTTPException(404, "Run not found")
    return data


@router.delete("/sessions/{session_id}/history/{run_id}")
async def delete_run(request: Request, session_id: str, run_id: str):
    run = _history_svc(request).get(run_id)
    if run is None or run.get("session_id") != session_id:
        raise HTTPException(404, "Run not found")
    _history_svc(request).delete(run_id)
    return {"deleted": True}


# ── Global history ───────────────────────────────────────


@router.get("/history", response_model=ExecutionListResponse)
async def list_all_history(
    request: Request,
    limit: int = 50,
    offset: int = 0,
    model: Optional[str] = None,
    status: Optional[str] = None,
):
    svc = _history_svc(request)
    runs = svc.list_runs(model=model, status=status, limit=limit, offset=offset)
    total = svc.count_runs(model=model, status=status)
    return ExecutionListResponse(
        runs=[ExecutionSummary(**_normalize(r)) for r in runs],
        total=total,
    )


@router.get("/history/{run_id}", response_model=ExecutionDetailResponse)
async def get_run_global(request: Request, run_id: str):
    run = _history_svc(request).get_detail(run_id)
    if run is None:
        raise HTTPException(404, "Run not found")
    return ExecutionDetailResponse(**_normalize_detail(run))


@router.get("/history/{run_id}/waterfall", response_model=WaterfallResponse)
async def get_waterfall(request: Request, run_id: str):
    data = _history_svc(request).get_waterfall(run_id)
    if data is None:
        raise HTTPException(404, "Run not found")
    return WaterfallResponse(**data)


# ── Analytics ────────────────────────────────────────────


@router.get("/analytics/stats", response_model=StatsResponse)
async def get_stats(request: Request, session_id: Optional[str] = None):
    return StatsResponse(**_history_svc(request).get_stats(session_id))


@router.get("/analytics/stage-stats")
async def get_stage_stats(request: Request, session_id: Optional[str] = None):
    stats = _history_svc(request).get_stage_stats(session_id)
    return {"stats": [StageStatsResponse(**s) for s in stats]}


@router.get("/analytics/cost", response_model=CostSummaryResponse)
async def get_cost_summary(request: Request, session_id: Optional[str] = None):
    data = _history_svc(request).get_cost_summary(session_id)
    by_model = [ModelCostResponse(**m) for m in data.get("by_model", [])]
    return CostSummaryResponse(
        session_id=data.get("session_id"),
        by_model=by_model,
        total_cost=data.get("total_cost", 0),
        total_executions=data.get("total_executions", 0),
    )


@router.get("/analytics/cost-trend", response_model=CostTrendResponse)
async def get_cost_trend(
    request: Request,
    session_id: Optional[str] = None,
    granularity: str = "hour",
    limit: int = 168,
):
    trend = _history_svc(request).get_cost_trend(session_id, granularity, limit)
    return CostTrendResponse(
        trend=[CostTrendPointResponse(**t) for t in trend],
        granularity=granularity,
    )


# ── A/B Test ─────────────────────────────────────────────


@router.post("/ab-test")
async def create_ab_test(request: Request, body: ABTestRequest):
    """Create placeholder executions for A/B test (actual execution done externally)."""
    svc = _history_svc(request)
    exec_a = svc.record(
        session_id="ab_test",
        input_text=body.user_input,
        result_text="",
        success=True,
        model="pending",
        environment_id=body.env_a_id,
    )
    exec_b = svc.record(
        session_id="ab_test",
        input_text=body.user_input,
        result_text="",
        success=True,
        model="pending",
        environment_id=body.env_b_id,
    )
    svc.add_tags(exec_a, ["ab_test", "side_a"])
    svc.add_tags(exec_b, ["ab_test", "side_b"])
    return {"exec_a_id": exec_a, "exec_b_id": exec_b}


@router.get("/ab-test/{exec_a_id}/{exec_b_id}", response_model=ABComparisonResponse)
async def get_ab_comparison(request: Request, exec_a_id: str, exec_b_id: str):
    svc = _history_svc(request)
    a = svc.get_detail(exec_a_id)
    b = svc.get_detail(exec_b_id)
    if not a or not b:
        raise HTTPException(404, "Execution not found")

    def _side(d):
        return {
            "execution_id": d["id"],
            "model": d.get("model", ""),
            "status": d.get("status", ""),
            "result_text": d.get("result_text", ""),
            "cost_usd": d.get("total_cost_usd", 0) or 0,
            "duration_ms": d.get("duration_ms", 0) or 0,
            "total_tokens": d.get("total_tokens", 0) or 0,
            "iterations": d.get("iterations", 0) or 0,
            "tool_calls": d.get("tool_call_count", 0) or 0,
        }

    return ABComparisonResponse(
        env_a=_side(a),
        env_b=_side(b),
        diff={
            "cost_diff": (a.get("total_cost_usd", 0) or 0)
            - (b.get("total_cost_usd", 0) or 0),
            "duration_diff": (a.get("duration_ms", 0) or 0)
            - (b.get("duration_ms", 0) or 0),
            "token_diff": (a.get("total_tokens", 0) or 0)
            - (b.get("total_tokens", 0) or 0),
        },
    )


# ── Helpers ──────────────────────────────────────────────


def _normalize(run: dict) -> dict:
    """Normalize DB row to ExecutionSummary fields."""
    return {
        "id": run.get("id", ""),
        "session_id": run.get("session_id", ""),
        "model": run.get("model", ""),
        "input_text": run.get("input_text", ""),
        "result_text": run.get("result_text"),
        "success": run.get("success", True),
        "status": run.get("status", "completed"),
        "iterations": run.get("iterations", 0) or 0,
        "total_cost_usd": run.get("total_cost_usd", 0) or 0,
        "duration_ms": run.get("duration_ms", 0) or 0,
        "total_tokens": run.get("total_tokens", 0) or 0,
        "tool_call_count": run.get("tool_call_count", 0) or 0,
        "environment_id": run.get("environment_id"),
        "created_at": run.get("created_at", ""),
        "tags": run.get("tags", []),
    }


def _normalize_detail(run: dict) -> dict:
    """Normalize DB row to ExecutionDetailResponse fields."""
    base = _normalize(run)
    base.update(
        {
            "input_tokens": run.get("input_tokens", 0) or 0,
            "output_tokens": run.get("output_tokens", 0) or 0,
            "cache_read_tokens": run.get("cache_read_tokens", 0) or 0,
            "cache_write_tokens": run.get("cache_write_tokens", 0) or 0,
            "thinking_tokens": run.get("thinking_tokens", 0) or 0,
            "error_type": run.get("error_type"),
            "error_message": run.get("error_message"),
            "error_stage": run.get("error_stage"),
            "finished_at": run.get("finished_at"),
            "stage_timings": run.get("stage_timings", []),
            "tool_call_records": run.get("tool_call_records", []),
        }
    )
    return base
