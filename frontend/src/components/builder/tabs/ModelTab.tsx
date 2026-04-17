/* ModelTab — edits a stage's StageModelOverride.
 *
 * Overriding means "for this stage only, use a different model / system
 * prompt / sampling params than the environment defaults." An empty override
 * (or null) falls back to the env-level model config.
 */
import React from "react";

import type { StageManifestEntry, StageModelOverride } from "../../../types/environment";

const COMMON_MODELS = [
  "claude-opus-4-5",
  "claude-sonnet-4-5",
  "claude-sonnet-4-20250514",
  "claude-haiku-4-5",
  "gpt-5",
  "gpt-5-mini",
  "gemini-2.5-pro",
];

interface ModelTabProps {
  stage: StageManifestEntry;
  supported: boolean;
  onChange: (next: StageModelOverride | null) => void;
}

const inputBase =
  "w-full bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded px-2 py-1.5 text-xs text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]";

const ModelTab: React.FC<ModelTabProps> = ({ stage, supported, onChange }) => {
  if (!supported) {
    return (
      <div className="p-4">
        <p className="text-xs italic text-[var(--text-muted)]">
          This stage does not support model overrides.
        </p>
      </div>
    );
  }

  const override: StageModelOverride = stage.model_override ?? {};

  const setField = <K extends keyof StageModelOverride>(
    key: K,
    value: StageModelOverride[K] | undefined
  ) => {
    const next = { ...override };
    if (value === undefined || value === "" || value === null) {
      delete next[key];
    } else {
      next[key] = value;
    }
    onChange(Object.keys(next).length === 0 ? null : next);
  };

  return (
    <div className="space-y-4 p-4">
      <div>
        <label className="block text-[11px] font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
          Model
        </label>
        <input
          list="model-suggestions"
          className={inputBase}
          value={(override.model as string | undefined) ?? ""}
          onChange={(e) => setField("model", e.target.value)}
          placeholder="Inherit from environment default"
        />
        <datalist id="model-suggestions">
          {COMMON_MODELS.map((m) => (
            <option key={m} value={m} />
          ))}
        </datalist>
      </div>

      <div>
        <label className="block text-[11px] font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
          System Prompt Override
        </label>
        <textarea
          className={`${inputBase} font-mono`}
          rows={4}
          value={(override.system_prompt as string | undefined) ?? ""}
          onChange={(e) => setField("system_prompt", e.target.value)}
          placeholder="(Optional) Stage-specific system prompt"
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
            Temperature
          </label>
          <input
            type="number"
            className={inputBase}
            step="0.01"
            min={0}
            max={2}
            value={override.temperature == null ? "" : String(override.temperature)}
            onChange={(e) =>
              setField(
                "temperature",
                e.target.value === "" ? undefined : parseFloat(e.target.value)
              )
            }
          />
        </div>
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
            Top-p
          </label>
          <input
            type="number"
            className={inputBase}
            step="0.01"
            min={0}
            max={1}
            value={override.top_p == null ? "" : String(override.top_p)}
            onChange={(e) =>
              setField(
                "top_p",
                e.target.value === "" ? undefined : parseFloat(e.target.value)
              )
            }
          />
        </div>
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
            Max Tokens
          </label>
          <input
            type="number"
            className={inputBase}
            step={1}
            min={1}
            value={override.max_tokens == null ? "" : String(override.max_tokens)}
            onChange={(e) =>
              setField(
                "max_tokens",
                e.target.value === "" ? undefined : parseInt(e.target.value, 10)
              )
            }
          />
        </div>
      </div>

      <div>
        <button
          type="button"
          onClick={() => onChange(null)}
          className="text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:underline"
        >
          Clear override (use environment default)
        </button>
      </div>
    </div>
  );
};

export default ModelTab;
