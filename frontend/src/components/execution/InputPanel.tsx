import { useState, useCallback } from "react";
import { useSessionStore } from "../../stores/sessionStore";
import { usePipelineStore } from "../../stores/pipelineStore";
import { useExecutionStore } from "../../stores/executionStore";
import { useWebSocket } from "../../hooks/useWebSocket";

export default function InputPanel() {
  const [input, setInput] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const activeSessionId = useSessionStore((s) => s.activeSessionId);
  const serverHasApiKey = useSessionStore((s) => s.serverHasApiKey);
  const createSession = useSessionStore((s) => s.createSession);
  const activePreset = usePipelineStore((s) => s.activePreset);
  const isExecuting = useExecutionStore((s) => s.isExecuting);
  const runningCostUsd = useExecutionStore((s) => s.runningCostUsd);
  const { execute, stopExecution } = useWebSocket();

  const handleSend = useCallback(async () => {
    if (!input.trim()) return;

    let sessionId = activeSessionId;
    if (!sessionId) {
      // If server already has ANTHROPIC_API_KEY in env, skip client-side key requirement
      if (!serverHasApiKey && !apiKey.trim()) {
        setShowApiKey(true);
        return;
      }
      sessionId = await createSession({
        preset: activePreset,
        api_key: apiKey.trim() || undefined,
      });
    }
    execute(sessionId, input.trim());
    setInput("");
  }, [input, activeSessionId, serverHasApiKey, apiKey, activePreset, createSession, execute]);

  return (
    <div className="px-6 py-4" style={{ borderTop: "1px solid var(--border)" }}>
      {showApiKey && !activeSessionId && (
        <div className="mb-3">
          <input
            type="password"
            placeholder="Anthropic API Key (sk-ant-...)"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="w-full text-sm px-4 py-2.5 rounded-lg outline-none mono"
            style={{
              background: "var(--bg-tertiary)",
              color: "var(--text-primary)",
              border: "1px solid var(--border)",
            }}
          />
        </div>
      )}
      <div className="flex gap-3">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder={
            activeSessionId
              ? "Type a message..."
              : "Type a message to start a new session..."
          }
          className="flex-1 text-sm px-4 py-2.5 rounded-lg resize-none outline-none"
          style={{
            background: "var(--bg-tertiary)",
            color: "var(--text-primary)",
            border: "1px solid var(--border)",
          }}
          rows={1}
          disabled={isExecuting}
        />
        {isExecuting ? (
          <button
            onClick={stopExecution}
            className="px-5 py-2.5 rounded-lg text-sm font-medium transition-all"
            style={{
              background: "rgba(212, 91, 91, 0.15)",
              color: "var(--red)",
              border: "1px solid var(--red)",
              cursor: "pointer",
            }}
          >
            Stop
          </button>
        ) : (
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="px-5 py-2.5 rounded-lg text-sm font-medium transition-all"
            style={{
              background: !input.trim() ? "var(--bg-tertiary)" : "var(--accent)",
              color: !input.trim() ? "var(--text-muted)" : "var(--bg-primary)",
              cursor: !input.trim() ? "not-allowed" : "pointer",
              opacity: !input.trim() ? 0.5 : 1,
            }}
          >
            Send
          </button>
        )}
      </div>
      <div className="flex items-center justify-between mt-2">
        {!activeSessionId && !showApiKey && !serverHasApiKey && (
          <button
            onClick={() => setShowApiKey(true)}
            className="text-[11px]"
            style={{ color: "var(--accent)" }}
          >
            Set API Key to create a session
          </button>
        )}
        {isExecuting && runningCostUsd > 0 && (
          <span
            className="ml-auto text-[11px] mono"
            style={{ color: "var(--text-muted)" }}
          >
            ${runningCostUsd.toFixed(6)}
          </span>
        )}
      </div>
    </div>
  );
}
