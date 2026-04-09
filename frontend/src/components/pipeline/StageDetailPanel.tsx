import { useUIStore } from "../../stores/uiStore";
import { usePipelineStore } from "../../stores/pipelineStore";
import { getLocalizedStageMeta, getCategoryColor } from "../../utils/stageMetadata";
import { UI_KO } from "../../locales/ko";

/* ── i18n helper ─────────────────────────────────────── */
const UI_EN = {
  overview: "Overview",
  technicalBehavior: "Technical Behavior",
  strategySlots: "Strategy Slots (Level 2)",
  currentConfig: "Current Configuration",
  architecture: "Architecture",
  active: "Active",
  inactive: "Inactive",
  bypassable: "Bypassable",
  bypass: "Bypass",
} as const;

function useLabels() {
  const locale = useUIStore((s) => s.locale);
  return locale === "ko" ? UI_KO : UI_EN;
}

/* ── Section wrapper ─────────────────────────────────── */
function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
      <h4
        className="text-[10px] uppercase tracking-[0.18em] font-semibold mb-3"
        style={{ color: "var(--text-muted)" }}
      >
        {title}
      </h4>
      {children}
    </div>
  );
}

/* ── Pill badge ──────────────────────────────────────── */
function Badge({
  label,
  accent,
  bg,
}: {
  label: string;
  accent: string;
  bg: string;
}) {
  return (
    <span
      className="text-[10px] px-2.5 py-1 rounded-full font-medium tracking-wide"
      style={{ background: bg, color: accent }}
    >
      {label}
    </span>
  );
}

/* ── Main Panel ──────────────────────────────────────── */
export default function StageDetailPanel() {
  const selectedOrder = useUIStore((s) => s.selectedStageOrder);
  const selectStage = useUIStore((s) => s.selectStage);
  const locale = useUIStore((s) => s.locale);
  const stages = usePipelineStore((s) => s.stages);
  const t = useLabels();

  if (selectedOrder === null) return null;

  const stage = stages.find((s) => s.order === selectedOrder);
  if (!stage) return null;

  const meta = getLocalizedStageMeta(selectedOrder, locale);
  const catColor = getCategoryColor(stage.category);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        style={{ background: "rgba(0,0,0,0.4)" }}
        onClick={() => selectStage(null)}
      />

      {/* Panel */}
      <div
        className="fixed right-0 top-0 bottom-0 w-[420px] overflow-y-auto z-50 animate-slide-in"
        style={{
          background: "var(--bg-secondary)",
          borderLeft: "1px solid var(--border)",
          boxShadow: "-8px 0 40px rgba(0,0,0,0.5)",
        }}
      >
        {/* ── Header ───────────────────────────────── */}
        <div
          className="p-5"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-base font-bold mono shrink-0"
                style={{
                  border: `2px solid ${catColor.accent}`,
                  color: catColor.accent,
                  background: catColor.bg,
                  boxShadow: `0 0 16px ${catColor.border}`,
                }}
              >
                {stage.order}
              </div>
              <div>
                <h3
                  className="text-xl font-bold leading-tight"
                  style={{ fontFamily: "'Playfair Display', serif", color: "var(--text-primary)" }}
                >
                  {meta?.displayName ?? stage.name}
                </h3>
                <span
                  className="text-[10px] uppercase tracking-[0.2em] font-medium"
                  style={{ color: catColor.accent }}
                >
                  {meta?.categoryLabel ?? stage.category.replace("_", " ")}
                </span>
              </div>
            </div>
            <button
              onClick={() => selectStage(null)}
              className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors"
              style={{
                color: "var(--text-muted)",
                background: "var(--bg-tertiary)",
                border: "1px solid var(--border)",
              }}
            >
              &times;
            </button>
          </div>

          {/* Status badges */}
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge
              label={stage.is_active ? t.active : t.inactive}
              accent={stage.is_active ? "var(--green)" : "var(--text-muted)"}
              bg={stage.is_active ? "rgba(91,186,111,0.12)" : "var(--bg-tertiary)"}
            />
            {meta && (
              <>
                <Badge
                  label={`${locale === "ko" ? "페이즈" : "Phase"} ${meta.phase}`}
                  accent="var(--accent)"
                  bg="var(--accent-dim)"
                />
                {meta.canBypass && (
                  <Badge
                    label={t.bypassable}
                    accent="var(--cyan)"
                    bg="rgba(91,186,186,0.1)"
                  />
                )}
              </>
            )}
          </div>
        </div>

        {/* ── Description ──────────────────────────── */}
        {meta && (
          <Section title={t.overview}>
            <p
              className="text-[13px] leading-[1.7]"
              style={{ color: "var(--text-primary)" }}
            >
              {meta.detailedDescription}
            </p>
            {meta.canBypass && meta.bypassCondition && (
              <div
                className="mt-3 rounded-lg px-3 py-2 text-[11px]"
                style={{
                  background: "rgba(91,186,186,0.06)",
                  border: "1px solid rgba(91,186,186,0.15)",
                  color: "var(--cyan)",
                }}
              >
                <span className="font-semibold">{t.bypass}:</span>{" "}
                {meta.bypassCondition}
              </div>
            )}
          </Section>
        )}

        {/* ── Technical Behavior ───────────────────── */}
        {meta && meta.technicalBehavior.length > 0 && (
          <Section title={t.technicalBehavior}>
            <ul className="space-y-2">
              {meta.technicalBehavior.map((item, i) => (
                <li key={i} className="flex gap-2.5 text-[12px] leading-relaxed">
                  <span
                    className="mt-1.5 w-1 h-1 rounded-full shrink-0"
                    style={{ background: catColor.accent }}
                  />
                  <span style={{ color: "var(--text-secondary)" }}>{item}</span>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {/* ── Strategy Slots (from metadata) ─────── */}
        {meta && meta.strategies.length > 0 && (
          <Section title={t.strategySlots}>
            <div className="space-y-4">
              {meta.strategies.map((slot) => (
                <div key={slot.slot}>
                  <div
                    className="text-[11px] font-semibold uppercase tracking-wider mb-2"
                    style={{ color: catColor.accent }}
                  >
                    {slot.slot}
                  </div>
                  <div className="space-y-1.5">
                    {slot.options.map((opt) => {
                      const isCurrent = stage.strategies.some(
                        (s) => s.current_impl === opt.name,
                      );
                      return (
                        <div
                          key={opt.name}
                          className="rounded-lg px-3 py-2.5 flex gap-3 items-start"
                          style={{
                            background: isCurrent
                              ? catColor.bg
                              : "var(--bg-tertiary)",
                            border: `1px solid ${isCurrent ? catColor.border : "var(--border)"}`,
                          }}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span
                                className="mono text-[11px] font-medium"
                                style={{
                                  color: isCurrent
                                    ? catColor.accent
                                    : "var(--text-primary)",
                                }}
                              >
                                {opt.name}
                              </span>
                              {isCurrent && (
                                <span
                                  className="text-[8px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider"
                                  style={{
                                    background: catColor.accent,
                                    color: "var(--bg-primary)",
                                  }}
                                >
                                  active
                                </span>
                              )}
                            </div>
                            <p
                              className="mt-1 text-[11px] leading-relaxed"
                              style={{ color: "var(--text-muted)" }}
                            >
                              {opt.description}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* ── Live Strategies (from backend) ─────── */}
        {stage.strategies.length > 0 && (
          <Section title={t.currentConfig}>
            <div className="space-y-3">
              {stage.strategies.map((strat) => (
                <div
                  key={strat.slot_name}
                  className="rounded-lg p-3"
                  style={{
                    background: "var(--bg-tertiary)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <div
                    className="text-[10px] uppercase tracking-widest mb-1"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {strat.slot_name}
                  </div>
                  <div
                    className="mono text-[12px] font-medium"
                    style={{ color: catColor.accent }}
                  >
                    {strat.current_impl}
                  </div>
                  {strat.available_impls.length > 1 && (
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {strat.available_impls.map((impl) => (
                        <span
                          key={impl}
                          className="text-[10px] px-2 py-0.5 rounded mono"
                          style={{
                            background:
                              impl === strat.current_impl
                                ? catColor.bg
                                : "var(--bg-primary)",
                            color:
                              impl === strat.current_impl
                                ? catColor.accent
                                : "var(--text-muted)",
                            border: `1px solid ${impl === strat.current_impl ? catColor.border : "var(--border)"}`,
                          }}
                        >
                          {impl}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* ── Architecture Notes ──────────────────── */}
        {meta?.architectureNotes && (
          <Section title={t.architecture}>
            <div
              className="rounded-lg p-3.5 text-[12px] leading-[1.7]"
              style={{
                background: "var(--bg-primary)",
                border: "1px solid var(--border)",
                color: "var(--text-secondary)",
              }}
            >
              {meta.architectureNotes}
            </div>
          </Section>
        )}

        {/* ── Footer spacer ──────────────────────── */}
        <div className="h-8" />
      </div>
    </>
  );
}
