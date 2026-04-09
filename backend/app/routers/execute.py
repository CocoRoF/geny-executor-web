"""Non-streaming execution endpoint."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request

from app.schemas.execute import ExecuteRequest, PipelineResultResponse

router = APIRouter(prefix="/api/execute", tags=["execute"])


@router.post("/{session_id}", response_model=PipelineResultResponse)
async def execute(request: Request, session_id: str, body: ExecuteRequest):
    session_service = request.app.state.session_service

    session = session_service.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    try:
        result = await session_service.run(session_id, body.input)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
