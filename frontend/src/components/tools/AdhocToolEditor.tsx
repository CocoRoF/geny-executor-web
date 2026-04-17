/* AdhocToolEditor — create/edit ad-hoc tools */
import React, { useState } from "react";
import { useToolStore } from "../../stores/toolStore";

interface AdhocToolEditorProps {
  sessionId: string;
  onComplete: () => void;
  onCancel: () => void;
}

type ExecutorType = "template" | "script" | "http" | "composite";

const AdhocToolEditor: React.FC<AdhocToolEditorProps> = ({
  sessionId,
  onComplete,
  onCancel,
}) => {
  const { createAdhocTool } = useToolStore();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [executorType, setExecutorType] = useState<ExecutorType>("template");
  const [tags, setTags] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  // Executor-specific config
  const [template, setTemplate] = useState("Hello, $name!");
  const [scriptCode, setScriptCode] = useState(
    'async def execute(input, ctx):\n    return input.get("message", "Hello")'
  );
  const [httpUrl, setHttpUrl] = useState("https://api.example.com/{endpoint}");
  const [httpMethod, setHttpMethod] = useState("GET");

  const handleCreate = async () => {
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    setError("");
    setCreating(true);

    const def: Record<string, unknown> = {
      name: name.trim(),
      description: description.trim(),
      input_schema: { type: "object", properties: {} },
      executor_type: executorType,
      tags: tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    };

    if (executorType === "template") {
      def.template_config = { template };
    } else if (executorType === "script") {
      def.script_config = { code: scriptCode, sandbox: true };
    } else if (executorType === "http") {
      def.http_config = { url: httpUrl, method: httpMethod };
    }

    try {
      await createAdhocTool(sessionId, def);
      onComplete();
    } catch (e) {
      setError(String(e));
    } finally {
      setCreating(false);
    }
  };

  const EXECUTOR_TYPES: { value: ExecutorType; label: string; desc: string }[] =
    [
      { value: "template", label: "Template", desc: "Text template with $variables" },
      { value: "script", label: "Script", desc: "Custom Python code (sandboxed)" },
      { value: "http", label: "HTTP", desc: "External REST API call" },
      { value: "composite", label: "Composite", desc: "Chain multiple tools" },
    ];

  return (
    <div className="p-4 space-y-4 max-w-xl">
      <h3 className="text-sm font-semibold text-[var(--text-primary)]">
        Create Ad-hoc Tool
      </h3>

      {/* Name + Description */}
      <div>
        <label className="block text-xs text-[var(--text-secondary)] mb-1">
          Name
        </label>
        <input
          className="w-full bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded px-2 py-1.5 text-sm text-[var(--text-primary)]"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="my_tool"
        />
      </div>

      <div>
        <label className="block text-xs text-[var(--text-secondary)] mb-1">
          Description
        </label>
        <textarea
          className="w-full bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded px-2 py-1.5 text-sm text-[var(--text-primary)]"
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What this tool does..."
        />
      </div>

      <div>
        <label className="block text-xs text-[var(--text-secondary)] mb-1">
          Tags (comma-separated)
        </label>
        <input
          className="w-full bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded px-2 py-1.5 text-sm text-[var(--text-primary)]"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="utility, text"
        />
      </div>

      {/* Executor type */}
      <div>
        <label className="block text-xs text-[var(--text-secondary)] mb-1.5">
          Executor Type
        </label>
        <div className="grid grid-cols-2 gap-2">
          {EXECUTOR_TYPES.map((et) => (
            <button
              key={et.value}
              className={`p-2 rounded border text-left transition-colors ${
                executorType === et.value
                  ? "border-[var(--accent)] bg-[var(--accent)]/10"
                  : "border-[var(--border-primary)] hover:border-[var(--accent)]/30"
              }`}
              onClick={() => setExecutorType(et.value)}
            >
              <div className="text-xs font-medium text-[var(--text-primary)]">
                {et.label}
              </div>
              <div className="text-[10px] text-[var(--text-muted)]">
                {et.desc}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Executor config */}
      <div className="border-t border-[var(--border-primary)] pt-3">
        {executorType === "template" && (
          <div>
            <label className="block text-xs text-[var(--text-secondary)] mb-1">
              Template
            </label>
            <textarea
              className="w-full bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded px-2 py-1.5 text-sm text-[var(--text-primary)] font-mono"
              rows={4}
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              spellCheck={false}
            />
          </div>
        )}

        {executorType === "script" && (
          <div>
            <label className="block text-xs text-[var(--text-secondary)] mb-1">
              Python Code
            </label>
            <textarea
              className="w-full bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded px-2 py-1.5 text-sm text-[var(--text-primary)] font-mono"
              rows={8}
              value={scriptCode}
              onChange={(e) => setScriptCode(e.target.value)}
              spellCheck={false}
            />
          </div>
        )}

        {executorType === "http" && (
          <>
            <div>
              <label className="block text-xs text-[var(--text-secondary)] mb-1">
                URL
              </label>
              <input
                className="w-full bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded px-2 py-1.5 text-sm text-[var(--text-primary)] font-mono"
                value={httpUrl}
                onChange={(e) => setHttpUrl(e.target.value)}
              />
            </div>
            <div className="mt-2">
              <label className="block text-xs text-[var(--text-secondary)] mb-1">
                Method
              </label>
              <select
                className="w-full bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded px-2 py-1.5 text-sm text-[var(--text-primary)]"
                value={httpMethod}
                onChange={(e) => setHttpMethod(e.target.value)}
              >
                {["GET", "POST", "PUT", "PATCH", "DELETE"].map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
            </div>
          </>
        )}

        {executorType === "composite" && (
          <p className="text-xs text-[var(--text-muted)] italic">
            Composite tool configuration coming soon
          </p>
        )}
      </div>

      {error && (
        <div className="text-xs p-2 rounded bg-red-500/10 text-red-400">
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <button
          className="flex-1 text-sm py-1.5 rounded bg-[var(--accent)] text-black font-medium hover:opacity-90 disabled:opacity-50"
          onClick={handleCreate}
          disabled={creating}
        >
          {creating ? "Creating..." : "Create Tool"}
        </button>
        <button
          className="text-sm py-1.5 px-4 rounded border border-[var(--border-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default AdhocToolEditor;
