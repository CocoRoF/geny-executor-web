/* ToolPresetSelector — select and apply a tool preset */
import React, { useEffect, useState } from "react";
import { useToolStore } from "../../stores/toolStore";

interface ToolPresetSelectorProps {
  sessionId: string;
}

const ToolPresetSelector: React.FC<ToolPresetSelectorProps> = ({
  sessionId,
}) => {
  const { presets, loadPresets, applyPreset } = useToolStore();
  const [applying, setApplying] = useState<string | null>(null);

  useEffect(() => {
    loadPresets(sessionId);
  }, [sessionId, loadPresets]);

  const handleApply = async (name: string) => {
    setApplying(name);
    try {
      await applyPreset(sessionId, name);
    } finally {
      setApplying(null);
    }
  };

  if (presets.length === 0) {
    return (
      <p className="text-xs text-[var(--text-muted)] italic p-3">
        No presets available
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {presets.map((p) => (
        <div
          key={p.name}
          className="border border-[var(--border-primary)] rounded-lg p-3"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium text-[var(--text-primary)]">
                {p.name}
              </span>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                {p.description}
              </p>
              <div className="flex gap-1 mt-1 flex-wrap">
                {p.tool_names.slice(0, 5).map((t) => (
                  <span
                    key={t}
                    className="text-[10px] px-1 py-0.5 rounded bg-[var(--bg-tertiary)] text-[var(--text-muted)]"
                  >
                    {t}
                  </span>
                ))}
                {p.tool_names.length > 5 && (
                  <span className="text-[10px] text-[var(--text-muted)]">
                    +{p.tool_names.length - 5}
                  </span>
                )}
              </div>
            </div>
            <button
              className="text-xs px-2.5 py-1 rounded bg-[var(--accent)] text-black font-medium hover:opacity-90 disabled:opacity-50 shrink-0"
              onClick={() => handleApply(p.name)}
              disabled={applying === p.name}
            >
              {applying === p.name ? "..." : "Apply"}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ToolPresetSelector;
