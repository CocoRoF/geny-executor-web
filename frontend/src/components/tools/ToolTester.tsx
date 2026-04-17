/* ToolTester — test a tool with JSON input */
import React, { useState } from "react";
import { useToolStore } from "../../stores/toolStore";
import type { ToolTestResult } from "../../types/editor";

interface ToolTesterProps {
  sessionId: string;
  toolName: string;
  onClose: () => void;
}

const ToolTester: React.FC<ToolTesterProps> = ({
  sessionId,
  toolName,
  onClose,
}) => {
  const { testTool } = useToolStore();
  const [input, setInput] = useState("{}");
  const [result, setResult] = useState<ToolTestResult | null>(null);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState("");

  const handleTest = async () => {
    setError("");
    setResult(null);
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(input);
    } catch {
      setError("Invalid JSON input");
      return;
    }
    setTesting(true);
    try {
      const res = await testTool(sessionId, toolName, parsed);
      setResult(res);
    } catch (e) {
      setError(String(e));
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="border border-[var(--border-primary)] rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-[var(--text-primary)]">
          Test: {toolName}
        </h4>
        <button
          className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-sm"
          onClick={onClose}
        >
          ✕
        </button>
      </div>

      <label className="block text-xs text-[var(--text-secondary)] mb-1">
        Input JSON
      </label>
      <textarea
        className="w-full bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded px-2 py-1.5 text-sm text-[var(--text-primary)] font-mono"
        rows={5}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        spellCheck={false}
      />

      <button
        className="mt-2 w-full text-sm py-1.5 rounded bg-[var(--accent)] text-black font-medium hover:opacity-90 disabled:opacity-50"
        onClick={handleTest}
        disabled={testing}
      >
        {testing ? "Running..." : "Run Test"}
      </button>

      {error && (
        <div className="mt-2 p-2 rounded bg-red-500/10 text-red-400 text-xs">
          {error}
        </div>
      )}

      {result && (
        <div
          className={`mt-2 p-2 rounded text-xs ${
            result.is_error
              ? "bg-red-500/10 text-red-400"
              : "bg-emerald-500/10 text-emerald-400"
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="font-medium">
              {result.success ? "✓ Success" : "✗ Error"}
            </span>
            <span className="text-[var(--text-muted)]">
              {result.execution_time_ms}ms
            </span>
          </div>
          <pre className="whitespace-pre-wrap break-all mt-1 max-h-40 overflow-y-auto">
            {result.result || result.error}
          </pre>
        </div>
      )}
    </div>
  );
};

export default ToolTester;
