/* EnvironmentSaveModal — modal for saving current pipeline as environment */
import React, { useState } from "react";

interface EnvironmentSaveModalProps {
  onSave: (name: string, description: string, tags: string[]) => Promise<void>;
  onClose: () => void;
}

const EnvironmentSaveModal: React.FC<EnvironmentSaveModalProps> = ({
  onSave,
  onClose,
}) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [tagsStr, setTagsStr] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    setError("");
    try {
      const tags = tagsStr
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      await onSave(name.trim(), description.trim(), tags);
      onClose();
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.6)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl p-5 space-y-4"
        style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3
          className="text-lg font-bold"
          style={{ fontFamily: "'Playfair Display', serif", color: "var(--text-primary)" }}
        >
          Save Environment
        </h3>

        <div className="space-y-3">
          <div>
            <label className="block text-xs text-[var(--text-secondary)] mb-1">
              Name *
            </label>
            <input
              className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] outline-none"
              placeholder="e.g., Code Review Agent"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs text-[var(--text-secondary)] mb-1">
              Description
            </label>
            <textarea
              className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded px-3 py-2 text-sm text-[var(--text-primary)] resize-none focus:border-[var(--accent)] outline-none"
              placeholder="Optional description..."
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs text-[var(--text-secondary)] mb-1">
              Tags (comma separated)
            </label>
            <input
              className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] outline-none"
              placeholder="e.g., agent, code-review"
              value={tagsStr}
              onChange={(e) => setTagsStr(e.target.value)}
            />
          </div>
        </div>

        {error && (
          <div className="text-xs p-2 rounded bg-red-500/10 text-red-400">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button
            className="text-xs px-4 py-2 rounded transition-colors"
            style={{
              background: "var(--bg-tertiary)",
              color: "var(--text-secondary)",
              border: "1px solid var(--border)",
            }}
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="text-xs px-4 py-2 rounded font-medium transition-opacity disabled:opacity-50"
            style={{ background: "var(--accent)", color: "#000" }}
            onClick={handleSave}
            disabled={saving || !name.trim()}
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EnvironmentSaveModal;
