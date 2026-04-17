/* ToolScopeEditor — view and edit tool scope rules */
import React, { useEffect, useState } from "react";
import { useToolStore } from "../../stores/toolStore";

interface ToolScopeEditorProps {
  sessionId: string;
}

const ToolScopeEditor: React.FC<ToolScopeEditorProps> = ({ sessionId }) => {
  const { scope, loadScope, updateScope } = useToolStore();
  const [mode, setMode] = useState<"allowlist" | "blocklist">("allowlist");
  const [patterns, setPatterns] = useState<string[]>([]);
  const [newPattern, setNewPattern] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadScope(sessionId);
  }, [sessionId, loadScope]);

  useEffect(() => {
    if (scope) {
      setMode(scope.mode);
      setPatterns(scope.patterns);
    }
  }, [scope]);

  const addPattern = () => {
    const trimmed = newPattern.trim();
    if (trimmed && !patterns.includes(trimmed)) {
      setPatterns([...patterns, trimmed]);
      setNewPattern("");
    }
  };

  const removePattern = (idx: number) => {
    setPatterns(patterns.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateScope(sessionId, { mode, patterns });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Mode toggle */}
      <div>
        <label className="block text-xs text-[var(--text-secondary)] mb-1.5">
          Scope Mode
        </label>
        <div className="flex gap-2">
          {(["allowlist", "blocklist"] as const).map((m) => (
            <button
              key={m}
              className={`flex-1 text-xs py-1.5 rounded border transition-colors ${
                mode === m
                  ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]"
                  : "border-[var(--border-primary)] text-[var(--text-secondary)] hover:border-[var(--accent)]/30"
              }`}
              onClick={() => setMode(m)}
            >
              {m === "allowlist" ? "Allow List" : "Block List"}
            </button>
          ))}
        </div>
      </div>

      {/* Patterns */}
      <div>
        <label className="block text-xs text-[var(--text-secondary)] mb-1.5">
          Patterns
        </label>
        <div className="flex gap-1.5 mb-2">
          <input
            className="flex-1 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded px-2 py-1 text-xs text-[var(--text-primary)] font-mono"
            value={newPattern}
            onChange={(e) => setNewPattern(e.target.value)}
            placeholder="file_*  or  mcp.*"
            onKeyDown={(e) => e.key === "Enter" && addPattern()}
          />
          <button
            className="text-xs px-2 py-1 rounded bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            onClick={addPattern}
          >
            Add
          </button>
        </div>
        {patterns.length === 0 ? (
          <p className="text-xs text-[var(--text-muted)] italic">
            No patterns — all tools{" "}
            {mode === "allowlist" ? "blocked" : "allowed"}
          </p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {patterns.map((p, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-[var(--bg-tertiary)] text-[var(--text-primary)] font-mono"
              >
                {p}
                <button
                  className="text-[var(--text-muted)] hover:text-red-400 text-[10px]"
                  onClick={() => removePattern(i)}
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Save */}
      <button
        className="w-full text-sm py-1.5 rounded bg-[var(--accent)] text-black font-medium hover:opacity-90 disabled:opacity-50"
        onClick={handleSave}
        disabled={saving}
      >
        {saving ? "Saving..." : "Save Scope"}
      </button>
    </div>
  );
};

export default ToolScopeEditor;
