import { useExecutionStore } from "../../stores/executionStore";
import { formatCost } from "../../utils/formatters";

export default function ResultPanel() {
  const result = useExecutionStore((s) => s.result);

  if (!result) return null;

  return (
    <div className="px-4 py-3" style={{ borderTop: "1px solid var(--border)" }}>
      {result.success ? (
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-[11px] font-medium" style={{ color: "var(--green)" }}>
              Complete
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
          <div
            className="rounded-lg p-3 text-sm max-h-40 overflow-y-auto whitespace-pre-wrap"
            style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}
          >
            {result.text || "(empty)"}
          </div>
        </div>
      ) : (
        <div>
          <span className="text-[11px] font-medium" style={{ color: "var(--red)" }}>
            Error
          </span>
          <div
            className="mt-1 rounded-lg p-3 text-sm"
            style={{ background: "rgba(212, 91, 91, 0.08)", color: "var(--red)" }}
          >
            {result.error}
          </div>
        </div>
      )}
    </div>
  );
}
