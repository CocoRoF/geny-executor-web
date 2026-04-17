import { usePipelineStore } from "../../stores/pipelineStore";
import { useUIStore } from "../../stores/uiStore";
import type { ViewMode } from "../../stores/uiStore";
import { APP_VERSION } from "../../version";

export default function Header() {
  const activePreset = usePipelineStore((s) => s.activePreset);
  const presets = usePipelineStore((s) => s.presets);
  const loadPipeline = usePipelineStore((s) => s.loadPipeline);
  const locale = useUIStore((s) => s.locale);
  const setLocale = useUIStore((s) => s.setLocale);
  const viewMode = useUIStore((s) => s.viewMode);
  const setViewMode = useUIStore((s) => s.setViewMode);

  const VIEW_TABS: { value: ViewMode; label: string }[] = [
    { value: "pipeline", label: "Pipeline" },
    { value: "tools", label: "Tools" },
    { value: "environment", label: "Environments" },
    { value: "history", label: "History" },
  ];

  return (
    <header
      className="h-12 flex items-center justify-between px-6 shrink-0"
      style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-secondary)" }}
    >
      <div className="flex items-center gap-6">
        {/* Brand */}
        <h1 className="text-sm font-semibold tracking-wide">
          <span style={{ color: "var(--accent)" }}>geny</span>
          <span style={{ color: "var(--text-muted)" }}>-executor-</span>
          <span style={{ color: "var(--text-primary)" }}>web</span>
        </h1>

        {/* View mode tabs */}
        <ToggleGroup
          options={VIEW_TABS}
          selected={viewMode}
          onSelect={(v) => setViewMode(v as ViewMode)}
          accent="var(--accent)"
        />

        {/* Preset dropdown — only in pipeline mode */}
        {viewMode === "pipeline" && (
          <select
            value={activePreset}
            onChange={(e) => loadPipeline(e.target.value)}
            className="text-xs px-3 py-1.5 rounded outline-none cursor-pointer"
            style={{
              background: "var(--bg-tertiary)",
              color: "var(--text-secondary)",
              border: "1px solid var(--border)",
            }}
          >
            {presets.map((p) => (
              <option key={p.name} value={p.name}>
                {p.name}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="flex items-center gap-4">
        {/* EN / KO toggle */}
        <ToggleGroup
          options={[
            { value: "en", label: "EN" },
            { value: "ko", label: "KO" },
          ]}
          selected={locale}
          onSelect={(v) => setLocale(v as "en" | "ko")}
          accent="var(--accent)"
        />

        <div
          className="text-[10px] uppercase tracking-widest"
          style={{ color: "var(--text-muted)" }}
        >
          {APP_VERSION}
        </div>
      </div>
    </header>
  );
}

/* ── Reusable toggle button group ── */

function ToggleGroup({
  options,
  selected,
  onSelect,
  accent,
}: {
  options: { value: string; label: string }[];
  selected: string;
  onSelect: (v: string) => void;
  accent: string;
}) {
  return (
    <div className="flex rounded-md overflow-hidden" style={{ border: "1px solid var(--border)" }}>
      {options.map((opt, i) => (
        <button
          key={opt.value}
          onClick={() => onSelect(opt.value)}
          className="text-[10px] font-semibold px-3 py-1 tracking-wider transition-colors"
          style={{
            background: selected === opt.value ? accent : "var(--bg-tertiary)",
            color: selected === opt.value ? "var(--bg-primary)" : "var(--text-muted)",
            borderLeft: i > 0 ? "1px solid var(--border)" : "none",
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
