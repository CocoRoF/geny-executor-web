import { useState, useCallback, useRef, useEffect } from "react";
import { useCompareStore, type StageTiming, type EngineRun } from "../../stores/compareStore";
import { useSessionStore } from "../../stores/sessionStore";
import { usePipelineStore } from "../../stores/pipelineStore";
import { createSession } from "../../api/session";
import type { PipelineEvent } from "../../types/events";

const STAGE_NAMES = [
  "input", "context", "system", "guard", "cache", "api",
  "token", "think", "parse", "tool", "agent", "evaluate",
  "loop", "emit", "memory", "yield",
];

export default function CompareView() {
  const [input, setInput] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const serverHasApiKey = useSessionStore((s) => s.serverHasApiKey);
  const activePreset = usePipelineStore((s) => s.activePreset);
  const { executor, harness, isComparing, startCompare, addEvent, reset } = useCompareStore();
  const wsRefs = useRef<{ executor: WebSocket | null; harness: WebSocket | null }>({
    executor: null, harness: null,
  });

  const isDone = executor.status !== "running" && harness.status !== "running" && isComparing;

  const cleanup = useCallback(() => {
    wsRefs.current.executor?.close();
    wsRefs.current.harness?.close();
    wsRefs.current = { executor: null, harness: null };
  }, []);

  useEffect(() => cleanup, [cleanup]);

  const handleRun = useCallback(async () => {
    if (!input.trim()) return;
    if (!serverHasApiKey && !apiKey.trim()) {
      setShowApiKey(true);
      return;
    }
    cleanup();
    reset();
    startCompare();

    const key = apiKey.trim() || undefined;
    const [execSession, harnSession] = await Promise.all([
      createSession({ preset: activePreset, engine: "executor", api_key: key }),
      createSession({ preset: activePreset, engine: "harness", api_key: key }),
    ]);

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;

    for (const [engine, sessionId] of [
      ["executor", execSession.session_id],
      ["harness", harnSession.session_id],
    ] as const) {
      const ws = new WebSocket(`${protocol}//${host}/ws/execute/${sessionId}`);
      wsRefs.current[engine] = ws;
      ws.onopen = () => ws.send(JSON.stringify({ type: "execute", input: input.trim() }));
      ws.onmessage = (ev) => {
        try {
          const event: PipelineEvent = JSON.parse(ev.data);
          addEvent(engine, event);
        } catch { /* ignore */ }
      };
      ws.onerror = () => { wsRefs.current[engine] = null; };
      ws.onclose = () => { wsRefs.current[engine] = null; };
    }
  }, [input, apiKey, serverHasApiKey, activePreset, cleanup, reset, startCompare, addEvent]);

  const handleStop = useCallback(() => {
    cleanup();
  }, [cleanup]);

  return (
    <div className="flex flex-col h-full">
      {/* Compare content */}
      <div className="flex-1 overflow-auto p-6" style={{ background: "var(--bg-primary)" }}>
        {!isComparing ? (
          <EmptyState />
        ) : (
          <CompareResults executor={executor} harness={harness} isDone={isDone} />
        )}
      </div>

      {/* Input bar */}
      <div className="shrink-0" style={{ borderTop: "1px solid var(--border)", background: "var(--bg-secondary)" }}>
        {showApiKey && (
          <div className="px-5 pt-3">
            <input
              type="password"
              placeholder="Anthropic API Key (sk-ant-...)"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full text-sm px-4 py-2.5 rounded-lg outline-none mono"
              style={{ background: "var(--bg-tertiary)", color: "var(--text-primary)", border: "1px solid var(--border)" }}
            />
          </div>
        )}
        <div className="px-5 py-3 flex items-center gap-3">
          <div className="flex items-center gap-2 shrink-0">
            {isComparing && !isDone ? (
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: "var(--accent)" }} />
            ) : (
              <div className="w-2 h-2 rounded-full" style={{ background: isDone ? "var(--green)" : "var(--border-hover)" }} />
            )}
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleRun(); }
            }}
            placeholder="Enter a prompt to compare Executor vs Harness..."
            className="flex-1 text-sm px-4 py-2 rounded-lg resize-none outline-none leading-snug"
            style={{ background: "var(--bg-tertiary)", color: "var(--text-primary)", border: "1px solid var(--border)", maxHeight: 80 }}
            rows={1}
            disabled={isComparing && !isDone}
          />
          {isComparing && !isDone ? (
            <button
              onClick={handleStop}
              className="px-4 py-2 rounded-lg text-[12px] font-medium shrink-0"
              style={{ background: "rgba(212,91,91,0.12)", color: "var(--red)", border: "1px solid rgba(212,91,91,0.3)", cursor: "pointer" }}
            >Stop</button>
          ) : (
            <button
              onClick={handleRun}
              disabled={!input.trim()}
              className="px-4 py-2 rounded-lg text-[12px] font-medium shrink-0"
              style={{
                background: !input.trim() ? "var(--bg-tertiary)" : "var(--accent)",
                color: !input.trim() ? "var(--text-muted)" : "var(--bg-primary)",
                cursor: !input.trim() ? "not-allowed" : "pointer",
                opacity: !input.trim() ? 0.5 : 1,
              }}
            >Compare</button>
          )}
        </div>
        {!showApiKey && !serverHasApiKey && (
          <div className="px-5 pb-2">
            <button onClick={() => setShowApiKey(true)} className="text-[10px]" style={{ color: "var(--accent)" }}>
              Set API Key to run comparison
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Empty state ── */

function EmptyState() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center" style={{ color: "var(--text-muted)" }}>
        <div className="text-5xl mb-4 opacity-20">⚡</div>
        <div className="text-sm font-medium mb-1">Engine Comparison</div>
        <div className="text-xs opacity-60">
          Send a prompt to compare Python (Executor) vs Rust (Harness) side by side
        </div>
      </div>
    </div>
  );
}

/* ── Compare results ── */

function CompareResults({ executor, harness, isDone }: { executor: EngineRun; harness: EngineRun; isDone: boolean }) {
  const allStages = STAGE_NAMES.filter(
    (s) => executor.stageTimings.has(s) || harness.stageTimings.has(s)
  );

  const maxDuration = Math.max(
    ...allStages.flatMap((s) => [
      executor.stageTimings.get(s)?.duration ?? 0,
      harness.stageTimings.get(s)?.duration ?? 0,
    ]),
    1,
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4">
        <SummaryCard run={executor} label="Python — Executor" color="var(--blue)" />
        <SummaryCard run={harness} label="Rust — Harness" color="var(--accent)" />
      </div>

      {/* Stage-by-stage comparison */}
      <div className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--border)", background: "var(--bg-secondary)" }}>
        {/* Header row */}
        <div className="grid grid-cols-[140px_1fr_80px_1fr_80px] gap-0 px-4 py-2"
          style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-tertiary)" }}>
          <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Stage</div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-right pr-2" style={{ color: "var(--blue)" }}>Executor</div>
          <div className="text-[10px] font-semibold uppercase tracking-wider mono" style={{ color: "var(--blue)" }}>Time</div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-right pr-2" style={{ color: "var(--accent)" }}>Harness</div>
          <div className="text-[10px] font-semibold uppercase tracking-wider mono" style={{ color: "var(--accent)" }}>Time</div>
        </div>
        {/* Stage rows */}
        {allStages.map((stage) => (
          <StageRow
            key={stage}
            stage={stage}
            execTiming={executor.stageTimings.get(stage) ?? null}
            harnTiming={harness.stageTimings.get(stage) ?? null}
            maxDuration={maxDuration}
          />
        ))}
        {/* Total row */}
        {isDone && (
          <div
            className="grid grid-cols-[140px_1fr_80px_1fr_80px] gap-0 px-4 py-2.5"
            style={{ borderTop: "2px solid var(--border)", background: "var(--bg-tertiary)" }}
          >
            <div className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>TOTAL</div>
            <div />
            <div className="text-xs font-bold mono" style={{ color: "var(--blue)" }}>
              {executor.totalDuration != null ? formatMs(executor.totalDuration) : "—"}
            </div>
            <div />
            <div className="text-xs font-bold mono" style={{ color: "var(--accent)" }}>
              {harness.totalDuration != null ? formatMs(harness.totalDuration) : "—"}
            </div>
          </div>
        )}
      </div>

      {/* Speedup badge */}
      {isDone && executor.totalDuration && harness.totalDuration && (
        <SpeedupBadge execMs={executor.totalDuration} harnMs={harness.totalDuration} />
      )}

      {/* Output comparison */}
      {isDone && (executor.result || harness.result) && (
        <div className="grid grid-cols-2 gap-4">
          <OutputCard run={executor} label="Executor Output" color="var(--blue)" />
          <OutputCard run={harness} label="Harness Output" color="var(--accent)" />
        </div>
      )}
    </div>
  );
}

/* ── Summary card ── */

function SummaryCard({ run, label, color }: { run: EngineRun; label: string; color: string }) {
  const stageCount = [...run.stageTimings.values()].filter((s) => s.status === "completed").length;
  const isRunning = run.status === "running";

  return (
    <div className="rounded-lg p-4" style={{ border: `1px solid ${color}33`, background: "var(--bg-secondary)" }}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color }}>{label}</span>
        <StatusBadge status={run.status} />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <MiniStat label="Stages" value={isRunning ? `${stageCount}/16` : String(stageCount)} />
        <MiniStat label="Duration" value={run.totalDuration != null ? formatMs(run.totalDuration) : isRunning ? "..." : "—"} />
        <MiniStat label="Cost" value={run.result ? `$${run.result.total_cost_usd.toFixed(4)}` : "—"} />
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[9px] uppercase tracking-wider mb-0.5" style={{ color: "var(--text-muted)" }}>{label}</div>
      <div className="text-sm font-semibold mono" style={{ color: "var(--text-primary)" }}>{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, { bg: string; color: string; text: string }> = {
    idle: { bg: "var(--bg-tertiary)", color: "var(--text-muted)", text: "Idle" },
    running: { bg: "rgba(200,164,92,0.15)", color: "var(--accent)", text: "Running" },
    complete: { bg: "rgba(91,186,111,0.15)", color: "var(--green)", text: "Complete" },
    error: { bg: "rgba(212,91,91,0.15)", color: "var(--red)", text: "Error" },
  };
  const s = styles[status] ?? styles.idle;
  return (
    <span className="text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ background: s.bg, color: s.color }}>
      {status === "running" && <span className="inline-block w-1.5 h-1.5 rounded-full mr-1 animate-pulse" style={{ background: s.color }} />}
      {s.text}
    </span>
  );
}

/* ── Stage row ── */

function StageRow({ stage, execTiming, harnTiming, maxDuration }: {
  stage: string;
  execTiming: StageTiming | null;
  harnTiming: StageTiming | null;
  maxDuration: number;
}) {
  const execMs = execTiming?.duration ?? null;
  const harnMs = harnTiming?.duration ?? null;
  const execPct = execMs != null ? Math.max((execMs / maxDuration) * 100, 1) : 0;
  const harnPct = harnMs != null ? Math.max((harnMs / maxDuration) * 100, 1) : 0;

  const isBypassed = (execTiming?.status === "bypassed" || !execTiming) &&
                     (harnTiming?.status === "bypassed" || !harnTiming);

  const order = execTiming?.order ?? harnTiming?.order ?? 0;

  return (
    <div
      className="grid grid-cols-[140px_1fr_80px_1fr_80px] gap-0 px-4 py-1.5 items-center transition-colors"
      style={{
        borderBottom: "1px solid var(--border)",
        opacity: isBypassed ? 0.35 : 1,
      }}
    >
      {/* Stage name */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] mono w-5 text-right" style={{ color: "var(--text-muted)" }}>{order}</span>
        <span className="text-xs font-medium capitalize" style={{ color: "var(--text-primary)" }}>{stage}</span>
      </div>

      {/* Executor bar (grows right-to-left) */}
      <div className="flex justify-end pr-2">
        <div className="h-3.5 rounded-sm transition-all duration-500"
          style={{
            width: `${execPct}%`,
            minWidth: execMs != null ? 4 : 0,
            background: getBarColor(execTiming?.status, "var(--blue)"),
          }}
        />
      </div>
      <div className="text-[11px] mono" style={{ color: execMs != null ? "var(--text-secondary)" : "var(--text-muted)" }}>
        {execTiming?.status === "running" ? (
          <span className="animate-pulse">...</span>
        ) : execMs != null ? formatMs(execMs) : "—"}
      </div>

      {/* Harness bar (grows left-to-right) */}
      <div className="flex justify-end pr-2">
        <div className="h-3.5 rounded-sm transition-all duration-500"
          style={{
            width: `${harnPct}%`,
            minWidth: harnMs != null ? 4 : 0,
            background: getBarColor(harnTiming?.status, "var(--accent)"),
          }}
        />
      </div>
      <div className="text-[11px] mono" style={{ color: harnMs != null ? "var(--text-secondary)" : "var(--text-muted)" }}>
        {harnTiming?.status === "running" ? (
          <span className="animate-pulse">...</span>
        ) : harnMs != null ? formatMs(harnMs) : "—"}
      </div>
    </div>
  );
}

/* ── Speedup badge ── */

function SpeedupBadge({ execMs, harnMs }: { execMs: number; harnMs: number }) {
  const ratio = execMs / harnMs;
  const faster = ratio > 1 ? "harness" : "executor";
  const speedup = faster === "harness" ? ratio : 1 / ratio;
  const label = faster === "harness" ? "Rust (Harness)" : "Python (Executor)";
  const color = faster === "harness" ? "var(--accent)" : "var(--blue)";

  if (Math.abs(ratio - 1) < 0.05) {
    return (
      <div className="text-center py-3">
        <span className="text-sm" style={{ color: "var(--text-muted)" }}>
          Both engines performed equally
        </span>
      </div>
    );
  }

  return (
    <div className="text-center py-3">
      <span className="text-lg font-bold mono" style={{ color }}>
        {speedup.toFixed(2)}×
      </span>
      <span className="text-sm ml-2" style={{ color: "var(--text-secondary)" }}>
        faster — {label}
      </span>
    </div>
  );
}

/* ── Output card ── */

function OutputCard({ run, label, color }: { run: EngineRun; label: string; color: string }) {
  return (
    <div className="rounded-lg overflow-hidden" style={{ border: `1px solid ${color}33`, background: "var(--bg-secondary)" }}>
      <div className="px-3 py-1.5" style={{ borderBottom: `1px solid ${color}33`, background: `${color}0d` }}>
        <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color }}>{label}</span>
      </div>
      <div className="p-3 text-xs leading-relaxed max-h-48 overflow-auto" style={{ color: "var(--text-primary)" }}>
        {run.result?.success ? (
          <pre className="whitespace-pre-wrap font-[inherit]">{run.result.text || "(empty)"}</pre>
        ) : run.result?.error ? (
          <span style={{ color: "var(--red)" }}>{run.result.error}</span>
        ) : (
          <span style={{ color: "var(--text-muted)" }}>No output</span>
        )}
      </div>
    </div>
  );
}

/* ── Helpers ── */

function formatMs(ms: number): string {
  if (ms < 1) return "<1ms";
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function getBarColor(status: string | undefined, base: string): string {
  if (status === "bypassed") return "var(--text-muted)";
  if (status === "error") return "var(--red)";
  if (status === "running") return `${base}88`;
  return base;
}
