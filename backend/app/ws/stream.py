"""WebSocket endpoint for streaming pipeline execution."""

from __future__ import annotations

import json
from dataclasses import asdict
from typing import Any

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter()


def _sanitize(obj: Any) -> Any:
    """Recursively ensure all values are JSON-serializable."""
    if obj is None or isinstance(obj, (bool, int, float, str)):
        return obj
    if isinstance(obj, dict):
        return {str(k): _sanitize(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [_sanitize(v) for v in obj]
    try:
        json.dumps(obj)
        return obj
    except (TypeError, ValueError):
        return str(obj)


@router.websocket("/ws/execute/{session_id}")
async def execute_stream(websocket: WebSocket, session_id: str):
    """Stream pipeline execution events over WebSocket.

    Protocol:
      Client → {"type": "execute", "input": "<text>"}
      Server → PipelineEvent JSON objects (one per message)
      Server → {"type": "error", "data": {"error": "<msg>"}} on failure
    """
    await websocket.accept()
    session_service = websocket.app.state.session_service

    session = session_service.get(session_id)
    if not session:
        await websocket.send_json({"type": "error", "data": {"error": "Session not found"}})
        await websocket.close()
        return

    try:
        while True:
            raw = await websocket.receive_text()
            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                await websocket.send_json({"type": "error", "data": {"error": "Invalid JSON"}})
                continue

            if msg.get("type") == "execute":
                input_text = msg.get("input", "").strip()
                if not input_text:
                    await websocket.send_json(
                        {"type": "error", "data": {"error": "Input must not be empty"}}
                    )
                    continue

                async for event in session_service.run_stream(session_id, input_text):
                    try:
                        event_dict = asdict(event)
                    except TypeError:
                        # PyO3 objects (geny-harness) don't support asdict
                        event_dict = {
                            "type": getattr(event, "type", getattr(event, "event_type", "")),
                            "stage": getattr(event, "stage", ""),
                            "iteration": getattr(event, "iteration", 0),
                            "timestamp": getattr(event, "timestamp", ""),
                            "data": getattr(event, "data", {}),
                        }
                    event_dict["data"] = _sanitize(event_dict.get("data", {}))
                    await websocket.send_json(event_dict)

    except WebSocketDisconnect:
        pass
    except Exception as e:
        try:
            await websocket.send_json({"type": "error", "data": {"error": str(e)}})
        except Exception:
            pass
