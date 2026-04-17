"""Editor sync WebSocket — broadcasts pipeline mutations to connected clients."""

from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timezone
from typing import Any, Dict, Optional, Set

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter(tags=["editor-sync"])


class EditorSyncManager:
    """Manages per-session WebSocket connections for live editing sync."""

    def __init__(self) -> None:
        self._connections: Dict[str, Set[WebSocket]] = defaultdict(set)

    async def connect(self, session_id: str, ws: WebSocket) -> None:
        await ws.accept()
        self._connections[session_id].add(ws)

    def disconnect(self, session_id: str, ws: WebSocket) -> None:
        self._connections[session_id].discard(ws)
        if not self._connections[session_id]:
            del self._connections[session_id]

    async def broadcast_mutation(
        self,
        session_id: str,
        data: Dict[str, Any],
        exclude: Optional[WebSocket] = None,
    ) -> None:
        event = {
            "type": "mutation",
            "data": data,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        dead: list[WebSocket] = []
        for ws in self._connections.get(session_id, set()):
            if ws is exclude:
                continue
            try:
                await ws.send_json(event)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(session_id, ws)

    async def broadcast_tool_change(
        self,
        session_id: str,
        change_type: str,
        tool_name: str,
    ) -> None:
        event = {
            "type": "tool_change",
            "data": {"change_type": change_type, "tool_name": tool_name},
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        dead: list[WebSocket] = []
        for ws in self._connections.get(session_id, set()):
            try:
                await ws.send_json(event)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(session_id, ws)

    @property
    def active_sessions(self) -> list[str]:
        return list(self._connections.keys())


# Singleton — set on app.state in main.py
editor_sync_manager = EditorSyncManager()


@router.websocket("/ws/editor/{session_id}")
async def editor_websocket(websocket: WebSocket, session_id: str):
    manager = editor_sync_manager
    await manager.connect(session_id, websocket)
    try:
        while True:
            data = await websocket.receive_json()
            # Echo received commands back as acknowledgement
            if data.get("type") == "ping":
                await websocket.send_json({"type": "pong"})
    except WebSocketDisconnect:
        manager.disconnect(session_id, websocket)
    except Exception:
        manager.disconnect(session_id, websocket)
