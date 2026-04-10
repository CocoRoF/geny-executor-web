import { useExecutionStore } from "../../stores/executionStore";
import { formatCost } from "../../utils/formatters";

export default function ResultPanel() {
  const result = useExecutionStore((s) => s.result);
  const streamingText = useExecutionStore((s) => s.streamingText);
  const isStreaming = useExecutionStore((s) => s.isStreaming);
  const isExecuting = useExecutionStore((s) => s.isExecuting);
  const runningCostUsd = useExecutionStore((s) => s.runningCostUsd);

  // Show streaming text while API is running
  if (isExecuting && streamingText) {
    return (
      <div
        className="mx-3 my-3 rounded-lg"
        style={{
          background: "rgba(200,164,92,0.04)",
          border: "1px solid rgba(200,164,92,0.15)",
        }}
      >
        <div className="p-3">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex items-center gap-2">
              <div
                className="w-1.5 h-1.5 rounded-full animate-pulse"
                style={{ background: "var(--accent)" }}
              />
              <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--accent)" }}>
                Streaming
              </span>
            </div>
            {runningCostUsd > 0 && (
              <span className="text-[10px] mono" style={{ color: "var(--text-muted)" }}>
                {formatCost(runningCostUsd)}
              </span>
            )}
          </div>
          <div
            className="rounded-md p-3 text-[12px] leading-relaxed max-h-60 overflow-y-auto whitespace-pre-wrap"
            style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}
          >
            {streamingText}
            {isStreaming && (
              <span
                className="inline-block w-[2px] h-[14px] ml-0.5 animate-pulse"
                style={{ background: "var(--accent)", verticalAlign: "text-bottom" }}
              />
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!result) return null;

  return (
    <div
      className="mx-3 my-3 rounded-lg"
      style={{
        background: result.success
          ? "rgba(91,186,111,0.06)"
          : "rgba(212,91,91,0.06)",
        border: `1px solid ${result.success ? "rgba(91,186,111,0.2)" : "rgba(212,91,91,0.2)"}`,
      }}
    >
      {result.success ? (
        <div className="p-3">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--green)" }}>
              &#10003; Complete
            </span>
            <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
              {result.iterations} iter
            </span>
            {result.total_cost_usd > 0 && (
              <span className="text-[10px] mono" style={{ color: "var(--text-muted)" }}>
                {formatCost(result.total_cost_usd)}
              </span>
            )}
          </div>
          {result.text && (
            <div
              className="rounded-md p-3 text-[12px] leading-relaxed max-h-60 overflow-y-auto whitespace-pre-wrap"
              style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}
            >
              {result.text}
            </div>
          )}
        </div>
      ) : (
        <div className="p-3">
          <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--red)" }}>
            &#10007; Error
          </span>
          <div
            className="mt-2 rounded-md p-3 text-[12px] leading-relaxed"
            style={{ background: "rgba(212,91,91,0.06)", color: "var(--red)" }}
          >
            {result.error}
          </div>
        </div>
      )}
    </div>
  );
}
