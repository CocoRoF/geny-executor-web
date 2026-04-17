/* ModelConfigEditor — edit model config (model, temperature, max_tokens, etc.) */
import React, { useState } from "react";
import { useEditorStore } from "../../stores/editorStore";

interface ModelConfigEditorProps {
  sessionId: string;
}

const MODELS = [
  { group: "Anthropic", models: ["claude-sonnet-4-20250514", "claude-opus-4-20250514", "claude-haiku-35-20250620"] },
  { group: "OpenAI", models: ["gpt-4o", "gpt-4o-mini", "o1", "o1-mini"] },
];

const ModelConfigEditor: React.FC<ModelConfigEditorProps> = ({ sessionId }) => {
  const { updateModelConfig, lastResult } = useEditorStore();
  const [config, setConfig] = useState({
    model: "",
    temperature: 0.7,
    max_tokens: 8192,
    thinking_enabled: false,
    thinking_budget_tokens: 10000,
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async (changes: Record<string, unknown>) => {
    setSaving(true);
    try {
      await updateModelConfig(sessionId, changes);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-3 space-y-4">
      <h4 className="text-sm font-semibold text-[var(--text-primary)]">
        Model Configuration
      </h4>

      {/* Model selector */}
      <div>
        <label className="block text-xs text-[var(--text-secondary)] mb-1">
          Model
        </label>
        <select
          className="w-full bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded px-2 py-1.5 text-sm text-[var(--text-primary)]"
          value={config.model}
          onChange={(e) => {
            setConfig({ ...config, model: e.target.value });
            handleSave({ model: e.target.value });
          }}
        >
          <option value="">Select model...</option>
          {MODELS.map((g) => (
            <optgroup key={g.group} label={g.group}>
              {g.models.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      {/* Temperature */}
      <div>
        <label className="block text-xs text-[var(--text-secondary)] mb-1">
          Temperature: {config.temperature}
        </label>
        <input
          type="range"
          className="w-full accent-[var(--accent)]"
          min={0}
          max={2}
          step={0.01}
          value={config.temperature}
          onChange={(e) => setConfig({ ...config, temperature: parseFloat(e.target.value) })}
          onMouseUp={() => handleSave({ temperature: config.temperature })}
        />
      </div>

      {/* Max tokens */}
      <div>
        <label className="block text-xs text-[var(--text-secondary)] mb-1">
          Max Tokens: {config.max_tokens.toLocaleString()}
        </label>
        <input
          type="range"
          className="w-full accent-[var(--accent)]"
          min={256}
          max={128000}
          step={256}
          value={config.max_tokens}
          onChange={(e) => setConfig({ ...config, max_tokens: parseInt(e.target.value) })}
          onMouseUp={() => handleSave({ max_tokens: config.max_tokens })}
        />
      </div>

      {/* Extended Thinking */}
      <div className="flex items-center justify-between">
        <label className="text-xs text-[var(--text-secondary)]">
          Extended Thinking
        </label>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            className="sr-only peer"
            checked={config.thinking_enabled}
            onChange={(e) => {
              setConfig({ ...config, thinking_enabled: e.target.checked });
              handleSave({ thinking_enabled: e.target.checked });
            }}
          />
          <div className="w-9 h-5 bg-[var(--bg-tertiary)] peer-checked:bg-[var(--accent)] rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all"></div>
        </label>
      </div>

      {config.thinking_enabled && (
        <div>
          <label className="block text-xs text-[var(--text-secondary)] mb-1">
            Thinking Budget: {config.thinking_budget_tokens.toLocaleString()}
          </label>
          <input
            type="range"
            className="w-full accent-[var(--accent)]"
            min={1000}
            max={128000}
            step={1000}
            value={config.thinking_budget_tokens}
            onChange={(e) =>
              setConfig({ ...config, thinking_budget_tokens: parseInt(e.target.value) })
            }
            onMouseUp={() =>
              handleSave({ thinking_budget_tokens: config.thinking_budget_tokens })
            }
          />
        </div>
      )}

      {/* Result feedback */}
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

export default ModelConfigEditor;
