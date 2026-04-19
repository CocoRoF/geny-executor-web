"""Per-session memory REST surface.

Exposes a thin mirror over the session's :class:`MemoryProvider` so
the UI can introspect the active backend, run ad-hoc retrieval, and
reset memory without having to reach into executor internals.

The executor contract is the source of truth — this router reshapes
its protocol objects into JSON only. Any capability the provider
doesn't advertise returns 409, never silently degrades.
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request

from geny_executor.memory.provider import Capability, Layer, RetrievalQuery

from app.schemas.memory import (
    MemoryChunkPayload,
    MemoryDescriptorResponse,
    MemoryRetrievalRequest,
    MemoryRetrievalResponse,
)
from app.services.exceptions import MemorySessionNotFoundError

router = APIRouter(prefix="/api/sessions", tags=["memory"])


def _memory_service(request: Request):
    svc = getattr(request.app.state, "memory_service", None)
    if svc is None:
        raise HTTPException(status_code=503, detail="Memory service not configured")
    return svc


@router.get("/{session_id}/memory", response_model=MemoryDescriptorResponse)
async def get_memory(request: Request, session_id: str):
    session_service = request.app.state.session_service
    if session_service.get(session_id) is None:
        raise HTTPException(status_code=404, detail="Session not found")

    memory = _memory_service(request)
    try:
        return memory.describe(session_id)
    except MemorySessionNotFoundError:
        raise HTTPException(
            status_code=404,
            detail="No memory provider attached to this session",
        )


@router.post("/{session_id}/memory/retrieve", response_model=MemoryRetrievalResponse)
async def retrieve_memory(
    request: Request, session_id: str, body: MemoryRetrievalRequest
):
    session_service = request.app.state.session_service
    if session_service.get(session_id) is None:
        raise HTTPException(status_code=404, detail="Session not found")

    memory = _memory_service(request)
    try:
        provider = memory.require(session_id)
    except MemorySessionNotFoundError:
        raise HTTPException(
            status_code=404,
            detail="No memory provider attached to this session",
        )

    if Capability.SEARCH not in provider.descriptor.capabilities:
        raise HTTPException(
            status_code=409,
            detail="This memory provider does not support retrieval",
        )

    if body.layers:
        try:
            layer_set = {Layer(x) for x in body.layers}
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=f"Invalid layer: {exc}")
        query = RetrievalQuery(
            text=body.query,
            layers=layer_set,
            max_per_layer=body.top_k,
            tag_filter=set(body.tags or ()),
        )
    else:
        # Fall back to the dataclass's default layer set.
        query = RetrievalQuery(
            text=body.query,
            max_per_layer=body.top_k,
            tag_filter=set(body.tags or ()),
        )

    result = await provider.retrieve(query)
    chunks = [
        MemoryChunkPayload(
            key=c.key,
            content=c.content,
            source=c.source,
            relevance_score=c.relevance_score,
            metadata=dict(c.metadata),
        )
        for c in result.chunks
    ]
    return MemoryRetrievalResponse(chunks=chunks)


@router.delete("/{session_id}/memory")
async def clear_memory(request: Request, session_id: str):
    session_service = request.app.state.session_service
    if session_service.get(session_id) is None:
        raise HTTPException(status_code=404, detail="Session not found")

    memory = _memory_service(request)
    released = memory.release(session_id)
    if not released:
        raise HTTPException(
            status_code=404,
            detail="No memory provider attached to this session",
        )
    return {"cleared": True}
