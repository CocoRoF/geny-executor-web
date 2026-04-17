/* useEditorSync — WebSocket hook for real-time editor synchronization */
import { useEffect, useRef, useCallback } from "react";
import { useEditorStore } from "../stores/editorStore";
import { useToolStore } from "../stores/toolStore";

interface EditorSyncMessage {
  type: "mutation" | "tool_change" | "snapshot_restored" | "error";
  data: Record<string, unknown>;
}

export function useEditorSync(sessionId: string | null) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttempts = useRef(0);
  const MAX_RECONNECT = 10;
  const BASE_DELAY = 1000;

  const loadStages = useEditorStore((s) => s.loadStages);
  const loadStageDetail = useEditorStore((s) => s.loadStageDetail);
  const loadMutationLog = useEditorStore((s) => s.loadMutationLog);
  const loadTools = useToolStore((s) => s.loadTools);

  const handleMessage = useCallback(
    (msg: EditorSyncMessage) => {
      if (!sessionId) return;

      switch (msg.type) {
        case "mutation": {
          const stageOrder = msg.data.stage_order as number | undefined;
          if (stageOrder != null) {
            loadStageDetail(sessionId, stageOrder);
          }
          loadMutationLog(sessionId);
          break;
        }
        case "tool_change":
          loadTools(sessionId);
          break;
        case "snapshot_restored":
          loadStages(sessionId);
          loadMutationLog(sessionId);
          break;
        case "error":
          console.error("[EditorSync] Server error:", msg.data);
          break;
      }
    },
    [sessionId, loadStageDetail, loadStages, loadMutationLog, loadTools]
  );

  const connect = useCallback(() => {
    if (!sessionId) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    // Determine WS url based on current page location
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    const url = `${protocol}//${host}/ws/editor/${sessionId}`;

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      reconnectAttempts.current = 0;
    };

    ws.onmessage = (event) => {
      try {
        const msg: EditorSyncMessage = JSON.parse(event.data);
        handleMessage(msg);
      } catch {
        // ignore malformed messages
      }
    };

    ws.onclose = (event) => {
      wsRef.current = null;
      // Reconnect with exponential backoff
      if (reconnectAttempts.current < MAX_RECONNECT && !event.wasClean) {
        const delay = BASE_DELAY * Math.pow(2, reconnectAttempts.current);
        reconnectAttempts.current++;
        reconnectTimer.current = setTimeout(connect, delay);
      }
    };

    ws.onerror = () => {
      // onclose will handle reconnection
    };
  }, [sessionId, handleMessage]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
        reconnectTimer.current = null;
      }
      if (wsRef.current) {
        wsRef.current.close(1000, "component unmount");
        wsRef.current = null;
      }
    };
  }, [connect]);

  const send = useCallback((data: Record<string, unknown>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  return { send };
}
