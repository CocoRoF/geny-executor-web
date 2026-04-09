import { usePipelineStore } from "../../stores/pipelineStore";
import { useUIStore } from "../../stores/uiStore";

export default function Header() {
  const activePreset = usePipelineStore((s) => s.activePreset);
  const presets = usePipelineStore((s) => s.presets);
  const loadPipeline = usePipelineStore((s) => s.loadPipeline);
  const locale = useUIStore((s) => s.locale);
  const setLocale = useUIStore((s) => s.setLocale);

  return (
    <header
      className="h-12 flex items-center justify-between px-6 shrink-0"
      style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-secondary)" }}
    >
      <div className="flex items-center gap-6">
        <h1 className="text-sm font-semibold tracking-wide">
          <span style={{ color: "var(--accent)" }}>geny</span>
          <span style={{ color: "var(--text-muted)" }}>-executor-</span>
          <span style={{ color: "var(--text-primary)" }}>web</span>
        </h1>
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
      </div>

      <div className="flex items-center gap-4">
        {/* EN / KO toggle */}
        <div
          className="flex rounded-md overflow-hidden"
          style={{ border: "1px solid var(--border)" }}
        >
          <button
            onClick={() => setLocale("en")}
            className="text-[10px] font-semibold px-3 py-1 tracking-wider transition-colors"
            style={{
              background: locale === "en" ? "var(--accent)" : "var(--bg-tertiary)",
              color: locale === "en" ? "var(--bg-primary)" : "var(--text-muted)",
            }}
          >
            EN
          </button>
          <button
            onClick={() => setLocale("ko")}
            className="text-[10px] font-semibold px-3 py-1 tracking-wider transition-colors"
            style={{
              background: locale === "ko" ? "var(--accent)" : "var(--bg-tertiary)",
              color: locale === "ko" ? "var(--bg-primary)" : "var(--text-muted)",
              borderLeft: "1px solid var(--border)",
            }}
          >
            KO
          </button>
        </div>

        <div className="text-[10px] uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
          v0.2.2
        </div>
      </div>
    </header>
  );
}
