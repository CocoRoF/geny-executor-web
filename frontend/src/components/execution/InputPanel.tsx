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
    <div
      className="shrink-0"
      style={{
        borderTop: "1px solid var(--border)",
        background: "var(--bg-secondary)",
      }}
    >
      {showApiKey && !activeSessionId && (
        <div className="px-5 pt-3">
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
      <div className="px-5 py-3 flex items-center gap-3">
        {/* Status / cost indicator */}
        <div className="flex items-center gap-2 shrink-0">
          {isExecuting ? (
            <>
              <div
                className="w-2 h-2 rounded-full animate-pulse"
                style={{ background: "var(--accent)" }}
              />
              {runningCostUsd > 0 && (
                <span
                  className="text-[10px] mono"
                  style={{ color: "var(--text-muted)" }}
                >
                  ${runningCostUsd.toFixed(4)}
                </span>
              )}
            </>
          ) : (
            <div
              className="w-2 h-2 rounded-full"
              style={{ background: activeSessionId ? "var(--green)" : "var(--border-hover)" }}
            />
          )}
        </div>

        {/* Text input */}
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
          className="flex-1 text-sm px-4 py-2 rounded-lg resize-none outline-none leading-snug"
          style={{
            background: "var(--bg-tertiary)",
            color: "var(--text-primary)",
            border: "1px solid var(--border)",
            maxHeight: 80,
          }}
          rows={1}
          disabled={isExecuting}
        />

        {/* Action buttons */}
        {isExecuting ? (
          <button
            onClick={stopExecution}
            className="px-4 py-2 rounded-lg text-[12px] font-medium transition-all shrink-0"
            style={{
              background: "rgba(212, 91, 91, 0.12)",
              color: "var(--red)",
              border: "1px solid rgba(212, 91, 91, 0.3)",
              cursor: "pointer",
            }}
          >
            Stop
          </button>
        ) : (
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="px-4 py-2 rounded-lg text-[12px] font-medium transition-all shrink-0"
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

      {/* Footer row */}
      {!activeSessionId && !showApiKey && !serverHasApiKey && (
        <div className="px-5 pb-2">
          <button
            onClick={() => setShowApiKey(true)}
            className="text-[10px]"
            style={{ color: "var(--accent)" }}
          >
            Set API Key to create a session
          </button>
        </div>
      )}
    </div>
  );
}
