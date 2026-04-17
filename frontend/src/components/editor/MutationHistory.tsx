/* MutationHistory — shows the change log for a session */
import React, { useEffect } from "react";
import { useEditorStore } from "../../stores/editorStore";

interface MutationHistoryProps {
  sessionId: string;
}

const MUTATION_COLORS: Record<string, string> = {
  swap_strategy: "text-blue-400",
  update_stage_config: "text-emerald-400",
  update_model_config: "text-purple-400",
  update_pipeline_config: "text-amber-400",
  set_stage_active: "text-orange-400",
  restore_snapshot: "text-cyan-400",
};

const MutationHistory: React.FC<MutationHistoryProps> = ({ sessionId }) => {
  const { mutationLog, loadMutationLog } = useEditorStore();

  useEffect(() => {
    loadMutationLog(sessionId);
  }, [sessionId, loadMutationLog]);

  if (mutationLog.length === 0) {
    return (
      <p className="text-xs text-[var(--text-muted)] italic p-3">
        No mutations yet
      </p>
    );
  }

  return (
    <div className="space-y-1 max-h-80 overflow-y-auto p-2">
      {mutationLog.map((m, i) => (
        <div
          key={i}
          className="border border-[var(--border-primary)] rounded px-2.5 py-1.5 text-xs"
        >
          <div className="flex items-center justify-between">
            <span
              className={`font-mono font-medium ${MUTATION_COLORS[m.mutation_type] || "text-[var(--text-primary)]"}`}
            >
              {m.mutation_type}
            </span>
            <span className="text-[var(--text-muted)]">
              {new Date(m.timestamp).toLocaleTimeString()}
            </span>
          </div>
          <p className="text-[var(--text-secondary)] mt-0.5 truncate">
            {m.target}
          </p>
        </div>
      ))}
    </div>
  );
};

export default MutationHistory;
