import { useRef, useCallback } from "react";
import { useExecutionStore } from "../stores/executionStore";
import type { PipelineEvent } from "../types/events";

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const addEvent = useExecutionStore((s) => s.addEvent);
  const setExecuting = useExecutionStore((s) => s.setExecuting);
  const reset = useExecutionStore((s) => s.reset);

  const execute = useCallback(
    (sessionId: string, input: string) => {
      reset();
      setExecuting(true);

      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws/execute/${sessionId}`;

      if (wsRef.current) {
        wsRef.current.close();
      }

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(JSON.stringify({ type: "execute", input }));
      };

      ws.onmessage = (ev) => {
        try {
          const event: PipelineEvent = JSON.parse(ev.data);
          addEvent(event);
        } catch {
          // ignore unparseable messages
        }
      };

      ws.onerror = () => {
        setExecuting(false);
        wsRef.current = null;
      };

      ws.onclose = () => {
        setExecuting(false);
        wsRef.current = null;
      };
    },
    [addEvent, setExecuting, reset]
  );

  const stopExecution = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setExecuting(false);
  }, [setExecuting]);

  return { execute, stopExecution };
}
