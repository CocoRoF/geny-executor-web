/* PipelineConfigEditor — edit pipeline-level configuration */
import React, { useState } from "react";
import { useEditorStore } from "../../stores/editorStore";

interface PipelineConfigEditorProps {
  sessionId: string;
}

const PipelineConfigEditor: React.FC<PipelineConfigEditorProps> = ({
  sessionId,
}) => {
  const { updatePipelineConfig, lastResult } = useEditorStore();
  const [config, setConfig] = useState({
    max_iterations: 25,
    cost_budget_usd: 5.0,
    context_window_budget: 100000,
    stream: true,
    single_turn: false,
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async (changes: Record<string, unknown>) => {
    setSaving(true);
    try {
      await updatePipelineConfig(sessionId, changes);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-3 space-y-4">
      <h4 className="text-sm font-semibold text-[var(--text-primary)]">
        Pipeline Configuration
      </h4>

      {/* Max iterations */}
      <div>
        <label className="block text-xs text-[var(--text-secondary)] mb-1">
          Max Iterations: {config.max_iterations}
        </label>
        <input
          type="range"
          className="w-full accent-[var(--accent)]"
          min={1}
          max={100}
          step={1}
          value={config.max_iterations}
          onChange={(e) =>
            setConfig({ ...config, max_iterations: parseInt(e.target.value) })
          }
          onMouseUp={() =>
            handleSave({ max_iterations: config.max_iterations })
          }
        />
      </div>

      {/* Cost budget */}
      <div>
        <label className="block text-xs text-[var(--text-secondary)] mb-1">
          Cost Budget (USD): ${config.cost_budget_usd.toFixed(2)}
        </label>
        <input
          type="range"
          className="w-full accent-[var(--accent)]"
          min={0.1}
          max={50}
          step={0.1}
          value={config.cost_budget_usd}
          onChange={(e) =>
            setConfig({
              ...config,
              cost_budget_usd: parseFloat(e.target.value),
            })
          }
          onMouseUp={() =>
            handleSave({ cost_budget_usd: config.cost_budget_usd })
          }
        />
      </div>

      {/* Context window budget */}
      <div>
        <label className="block text-xs text-[var(--text-secondary)] mb-1">
          Context Window:{" "}
          {config.context_window_budget.toLocaleString()} tokens
        </label>
        <input
          type="range"
          className="w-full accent-[var(--accent)]"
          min={1000}
          max={200000}
          step={1000}
          value={config.context_window_budget}
          onChange={(e) =>
            setConfig({
              ...config,
              context_window_budget: parseInt(e.target.value),
            })
          }
          onMouseUp={() =>
            handleSave({
              context_window_budget: config.context_window_budget,
            })
          }
        />
      </div>

      {/* Stream toggle */}
      <div className="flex items-center justify-between">
        <label className="text-xs text-[var(--text-secondary)]">
          Stream Output
        </label>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            className="sr-only peer"
            checked={config.stream}
            onChange={(e) => {
              setConfig({ ...config, stream: e.target.checked });
              handleSave({ stream: e.target.checked });
            }}
          />
          <div className="w-9 h-5 bg-[var(--bg-tertiary)] peer-checked:bg-[var(--accent)] rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all"></div>
        </label>
      </div>

      {/* Single-turn toggle */}
      <div className="flex items-center justify-between">
        <label className="text-xs text-[var(--text-secondary)]">
          Single Turn
        </label>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            className="sr-only peer"
            checked={config.single_turn}
            onChange={(e) => {
              setConfig({ ...config, single_turn: e.target.checked });
              handleSave({ single_turn: e.target.checked });
            }}
          />
          <div className="w-9 h-5 bg-[var(--bg-tertiary)] peer-checked:bg-[var(--accent)] rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all"></div>
        </label>
      </div>

      {lastResult && (
        <div
          className={`text-xs p-2 rounded ${
            lastResult.success
              ? "bg-emerald-500/10 text-emerald-400"
              : "bg-red-500/10 text-red-400"
          }`}
        >
          {lastResult.message}
        </div>
      )}

      {saving && (
        <p className="text-xs text-[var(--text-muted)] animate-pulse">
          Saving...
        </p>
      )}
    </div>
  );
};

export default PipelineConfigEditor;
