/* CreateEnvironmentModal — "New environment" wizard.
 *
 * Two modes supported:
 *   - blank        → empty manifest, user fills in every stage
 *   - from_preset  → clone a built-in / user preset as the starting point
 *
 * The from_session mode lives on the existing "Save current" button in
 * EnvironmentView; it is not exposed here since the builder is for
 * template authoring, not snapshot capture.
 */
import React from "react";

import { fetchPresets } from "../../api/environment";
import type { PresetInfo } from "../../types/editor";
import type {
  CreateEnvironmentMode,
  CreateEnvironmentPayload,
} from "../../types/environment";

interface CreateEnvironmentModalProps {
  onCreate: (payload: CreateEnvironmentPayload) => Promise<void>;
  onClose: () => void;
}

const CreateEnvironmentModal: React.FC<CreateEnvironmentModalProps> = ({
  onCreate,
  onClose,
}) => {
  const [mode, setMode] = React.useState<CreateEnvironmentMode>("blank");
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [presetName, setPresetName] = React.useState("");
  const [presets, setPresets] = React.useState<PresetInfo[]>([]);
  const [submitting, setSubmitting] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (mode !== "from_preset") return;
    fetchPresets()
      .then((list) => {
        setPresets(list);
        if (list.length > 0 && !presetName) setPresetName(list[0].name);
      })
      .catch((e) => setErr(String(e)));
  }, [mode, presetName]);

  const canSubmit =
    name.trim().length > 0 &&
    !submitting &&
    (mode !== "from_preset" || presetName.length > 0);

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setErr(null);
    try {
      await onCreate({
        mode,
        name: name.trim(),
        description: description.trim(),
        preset_name: mode === "from_preset" ? presetName : undefined,
      });
    } catch (e) {
      setErr(String(e));
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.55)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-lg shadow-2xl"
        style={{
          background: "var(--bg-secondary)",
          border: "1px solid var(--border)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <header
          className="px-4 py-3"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <h3
            className="text-base font-bold"
            style={{
              fontFamily: "'Playfair Display', serif",
              color: "var(--text-primary)",
            }}
          >
            New Environment
          </h3>
          <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
            Start from a blank manifest or clone a preset.
          </p>
        </header>

        <div className="p-4 space-y-4">
          {/* Mode picker */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMode("blank")}
              className="flex-1 px-3 py-2 rounded text-xs text-left transition-colors"
              style={{
                background:
                  mode === "blank" ? "var(--accent)" : "var(--bg-tertiary)",
                color: mode === "blank" ? "#000" : "var(--text-primary)",
                border: "1px solid var(--border)",
              }}
            >
              <div className="font-semibold">Blank</div>
              <div className="text-[10px] opacity-75 mt-0.5">
                16 inactive stages
              </div>
            </button>
            <button
              type="button"
              onClick={() => setMode("from_preset")}
              className="flex-1 px-3 py-2 rounded text-xs text-left transition-colors"
              style={{
                background:
                  mode === "from_preset"
                    ? "var(--accent)"
                    : "var(--bg-tertiary)",
                color: mode === "from_preset" ? "#000" : "var(--text-primary)",
                border: "1px solid var(--border)",
              }}
            >
              <div className="font-semibold">From preset</div>
              <div className="text-[10px] opacity-75 mt-0.5">
                Clone a built-in
              </div>
            </button>
          </div>

          {/* Name */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
              Name
            </label>
            <input
              autoFocus
              className="w-full bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded px-2 py-1.5 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="my-coding-agent"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
              Description
            </label>
            <textarea
              className="w-full bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded px-2 py-1.5 text-xs text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="(Optional)"
            />
          </div>

          {/* Preset picker */}
          {mode === "from_preset" && (
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
                Base preset
              </label>
              {presets.length === 0 ? (
                <p className="text-[11px] italic text-[var(--text-muted)]">
                  Loading presets…
                </p>
              ) : (
                <select
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded px-2 py-1.5 text-sm text-[var(--text-primary)]"
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                >
                  {presets.map((p) => (
                    <option key={p.name} value={p.name}>
                      {p.name}
                      {p.description ? ` — ${p.description}` : ""}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {err && <p className="text-[11px] text-red-400">{err}</p>}
        </div>

        <footer
          className="px-4 py-3 flex justify-end gap-2"
          style={{ borderTop: "1px solid var(--border)" }}
        >
          <button
            type="button"
            onClick={onClose}
            className="text-[11px] px-3 py-1.5 rounded"
            style={{
              background: "var(--bg-tertiary)",
              color: "var(--text-secondary)",
              border: "1px solid var(--border)",
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="text-[11px] px-3 py-1.5 rounded disabled:opacity-40"
            style={{ background: "var(--accent)", color: "#000" }}
          >
            {submitting ? "Creating…" : "Create"}
          </button>
        </footer>
      </div>
    </div>
  );
};

export default CreateEnvironmentModal;
