/* ToolsTab — edits a stage's StageToolBinding (mode + patterns).
 *
 * Modes:
 *   - inherit   → use the environment's global tool scope, ignore patterns
 *   - allowlist → only the listed patterns are callable at this stage
 *   - blocklist → every tool except the listed patterns is callable
 */
import React from "react";

import type { StageManifestEntry, StageToolBinding } from "../../../types/environment";

type BindingMode = StageToolBinding["mode"];

interface ToolsTabProps {
  stage: StageManifestEntry;
  supported: boolean;
  onChange: (next: StageToolBinding | null) => void;
}

const MODES: Array<{ value: BindingMode; label: string; hint: string }> = [
  {
    value: "inherit",
    label: "Inherit",
    hint: "Use the environment-level tool scope.",
  },
  {
    value: "allowlist",
    label: "Allow only",
    hint: "Only these patterns are callable here.",
  },
  {
    value: "blocklist",
    label: "Block",
    hint: "Everything except these patterns is callable.",
  },
];

const ToolsTab: React.FC<ToolsTabProps> = ({ stage, supported, onChange }) => {
  if (!supported) {
    return (
      <div className="p-4">
        <p className="text-xs italic text-[var(--text-muted)]">
          This stage does not support tool bindings.
        </p>
      </div>
    );
  }

  const binding: StageToolBinding = stage.tool_binding ?? {
    mode: "inherit",
    patterns: [],
  };

  const handleMode = (mode: BindingMode) => {
    if (mode === "inherit") {
      onChange({ mode: "inherit", patterns: [] });
    } else {
      onChange({ mode, patterns: binding.patterns });
    }
  };

  const addPattern = () => {
    onChange({ ...binding, patterns: [...binding.patterns, ""] });
  };

  const updatePattern = (i: number, value: string) => {
    const next = [...binding.patterns];
    next[i] = value;
    onChange({ ...binding, patterns: next });
  };

  const removePattern = (i: number) => {
    onChange({
      ...binding,
      patterns: binding.patterns.filter((_, j) => j !== i),
    });
  };

  return (
    <div className="space-y-4 p-4">
      <section>
        <label className="block text-[11px] font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-2">
          Binding Mode
        </label>
        <div className="flex gap-2">
          {MODES.map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() => handleMode(m.value)}
              className="flex-1 px-3 py-2 rounded text-xs text-left transition-colors"
              style={{
                background:
                  binding.mode === m.value
                    ? "var(--accent)"
                    : "var(--bg-tertiary)",
                color: binding.mode === m.value ? "#000" : "var(--text-primary)",
                border: "1px solid var(--border)",
              }}
            >
              <div className="font-semibold">{m.label}</div>
              <div className="text-[10px] opacity-75 mt-0.5">{m.hint}</div>
            </button>
          ))}
        </div>
      </section>

      {binding.mode !== "inherit" && (
        <section>
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-2">
            Patterns
          </label>
          <p className="text-[11px] text-[var(--text-muted)] mb-2">
            Glob-style tool name patterns. Use <code>*</code> as a wildcard
            (e.g. <code>mcp_*</code>, <code>weather.*</code>).
          </p>
          <div className="space-y-1.5">
            {binding.patterns.length === 0 && (
              <p className="text-[11px] italic text-[var(--text-muted)]">
                No patterns yet — add one below.
              </p>
            )}
            {binding.patterns.map((p, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <input
                  className="flex-1 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded px-2 py-1.5 text-xs text-[var(--text-primary)] font-mono"
                  value={p}
                  onChange={(e) => updatePattern(i, e.target.value)}
                  placeholder="tool_name_or_pattern"
                />
                <button
                  type="button"
                  onClick={() => removePattern(i)}
                  className="text-red-400 text-xs px-1"
                  aria-label={`Remove pattern ${i + 1}`}
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addPattern}
              className="text-xs text-[var(--accent)] hover:underline"
            >
              + Add pattern
            </button>
          </div>
        </section>
      )}

      <div>
        <button
          type="button"
          onClick={() => onChange(null)}
          className="text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:underline"
        >
          Clear binding (revert to default)
        </button>
      </div>
    </div>
  );
};

export default ToolsTab;
