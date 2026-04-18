/* EnvironmentPreview — render a saved environment's full configuration.
 *
 * Consumes EnvironmentDetailV2: prefers the v2 manifest (model/pipeline/stages
 * with artifact, strategies, tool_binding, model_override, config) and falls
 * back to the legacy snapshot shape for rows that haven't been resaved yet.
 */
import React from "react";
import type { EnvironmentDetailV2 } from "../../types/environment";
import type {
  EnvironmentManifest,
  StageManifestEntry,
} from "../../types/environment";
import { getStageMeta, getCategoryColor } from "../../utils/stageMetadata";

interface EnvironmentPreviewProps {
  detail: EnvironmentDetailV2;
}

interface NormalizedStage {
  order: number;
  name: string;
  active: boolean;
  artifact: string;
  strategies: Record<string, string>;
  config: Record<string, unknown>;
  tool_binding: { mode: string; patterns: string[] } | null;
  model_override: Record<string, unknown> | null;
}

/** Pull a uniform stage list out of either the v2 manifest or the legacy
 * snapshot, so the render code below only has to understand one shape. */
function normalizeStages(
  manifest: EnvironmentManifest | null,
  snapshot: Record<string, unknown> | null,
): NormalizedStage[] {
  if (manifest) {
    return manifest.stages.map((s: StageManifestEntry) => ({
      order: s.order,
      name: s.name,
      active: s.active,
      artifact: s.artifact ?? "",
      strategies: s.strategies ?? {},
      config: s.config ?? {},
      tool_binding: s.tool_binding ?? null,
      model_override:
        (s.model_override as Record<string, unknown> | null) ?? null,
    }));
  }
  const rawStages = (snapshot?.stages ?? []) as Record<string, unknown>[];
  return rawStages.map((s, i) => {
    const strategies = (s.strategies ?? {}) as
      | Record<string, unknown>
      | Array<Record<string, unknown>>;
    // Legacy snapshot stored strategies either as {slot: impl} dict or as
    // a list of {slot_name, current_impl} records — normalise both.
    let stratMap: Record<string, string> = {};
    if (Array.isArray(strategies)) {
      for (const entry of strategies) {
        const slot = String(entry.slot_name ?? entry.slot ?? "");
        const impl = String(entry.current_impl ?? entry.impl ?? "");
        if (slot) stratMap[slot] = impl;
      }
    } else if (strategies && typeof strategies === "object") {
      stratMap = Object.fromEntries(
        Object.entries(strategies).map(([k, v]) => [k, String(v)]),
      );
    }
    return {
      order: Number(s.order ?? i + 1),
      name: String(s.name ?? `stage_${i + 1}`),
      active:
        s.is_active !== undefined ? Boolean(s.is_active) : Boolean(s.active),
      artifact: String(s.artifact ?? ""),
      strategies: stratMap,
      config: (s.config ?? {}) as Record<string, unknown>,
      tool_binding: null,
      model_override: null,
    };
  });
}

function formatValue(val: unknown): string {
  if (val === null || val === undefined) return "—";
  if (typeof val === "boolean") return val ? "yes" : "no";
  if (typeof val === "object") {
    try {
      return JSON.stringify(val);
    } catch {
      return String(val);
    }
  }
  return String(val);
}

const ModelSection: React.FC<{ model: Record<string, unknown> }> = ({
  model,
}) => {
  const entries = Object.entries(model);
  return (
    <section
      className="rounded-lg p-3"
      style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}
    >
      <h4
        className="text-[10px] font-semibold uppercase tracking-wider mb-2"
        style={{ color: "var(--accent)" }}
      >
        Model
      </h4>
      {entries.length === 0 ? (
        <p className="text-xs italic text-[var(--text-muted)]">
          No model configured
        </p>
      ) : (
        <div className="space-y-1">
          {entries.map(([key, val]) => (
            <div key={key} className="flex justify-between text-xs gap-3">
              <span className="text-[var(--text-muted)] shrink-0">{key}</span>
              <span className="font-mono text-[var(--text-secondary)] truncate">
                {formatValue(val)}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

const PipelineSection: React.FC<{ pipeline: Record<string, unknown> }> = ({
  pipeline,
}) => {
  const entries = Object.entries(pipeline);
  return (
    <section
      className="rounded-lg p-3"
      style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}
    >
      <h4
        className="text-[10px] font-semibold uppercase tracking-wider mb-2"
        style={{ color: "var(--accent)" }}
      >
        Pipeline
      </h4>
      {entries.length === 0 ? (
        <p className="text-xs italic text-[var(--text-muted)]">
          No pipeline configuration
        </p>
      ) : (
        <div className="space-y-1">
          {entries.map(([key, val]) => (
            <div key={key} className="flex justify-between text-xs gap-3">
              <span className="text-[var(--text-muted)] shrink-0">{key}</span>
              <span className="font-mono text-[var(--text-secondary)] truncate">
                {formatValue(val)}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

const StageRow: React.FC<{ stage: NormalizedStage }> = ({ stage }) => {
  const meta = getStageMeta(stage.order);
  const category = meta?.category ?? "";
  const colors = getCategoryColor(category);
  const stratEntries = Object.entries(stage.strategies);
  const configEntries = Object.entries(stage.config);

  const hasToolBinding =
    stage.tool_binding !== null && stage.tool_binding.mode !== "inherit";
  const hasModelOverride =
    stage.model_override !== null &&
    Object.keys(stage.model_override).length > 0;

  return (
    <div
      className="rounded-md p-2.5 transition-opacity"
      style={{
        background: stage.active ? colors.bg : "transparent",
        border: `1px solid ${stage.active ? colors.border : "var(--border)"}`,
        opacity: stage.active ? 1 : 0.45,
      }}
    >
      <div className="flex items-center gap-2 mb-1">
        <span
          className="text-[9px] font-mono px-1.5 py-0.5 rounded"
          style={{
            background: "var(--bg-tertiary)",
            color: "var(--text-muted)",
          }}
        >
          {String(stage.order).padStart(2, "0")}
        </span>
        <span
          className="text-xs font-semibold"
          style={{
            color: stage.active ? "var(--text-primary)" : "var(--text-muted)",
            fontFamily: "'Playfair Display', serif",
          }}
        >
          {meta?.displayName ?? stage.name}
        </span>
        <span
          className="text-[9px] uppercase tracking-wider"
          style={{ color: colors.accent }}
        >
          {meta?.categoryLabel ?? category}
        </span>
        <div className="flex-1" />
        {hasToolBinding && (
          <span
            className="text-[9px] px-1.5 py-0.5 rounded"
            style={{
              background: "var(--accent-dim)",
              color: "var(--accent)",
              border: "1px solid var(--accent-glow)",
            }}
            title={`tool_binding: ${stage.tool_binding?.mode} (${stage.tool_binding?.patterns.length} patterns)`}
          >
            TOOLS
          </span>
        )}
        {hasModelOverride && (
          <span
            className="text-[9px] px-1.5 py-0.5 rounded"
            style={{
              background: "var(--accent-dim)",
              color: "var(--accent)",
              border: "1px solid var(--accent-glow)",
            }}
            title="stage has model_override"
          >
            MODEL
          </span>
        )}
        <span
          className="text-[9px] px-1.5 py-0.5 rounded font-semibold uppercase"
          style={{
            background: stage.active ? colors.accent : "var(--bg-tertiary)",
            color: stage.active ? "#000" : "var(--text-muted)",
          }}
        >
          {stage.active ? "ON" : "OFF"}
        </span>
      </div>

      {stage.artifact && (
        <div className="text-[10px] text-[var(--text-muted)] mb-1">
          artifact:{" "}
          <span className="font-mono text-[var(--text-secondary)]">
            {stage.artifact}
          </span>
        </div>
      )}

      {stratEntries.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-1">
          {stratEntries.map(([slot, impl]) => (
            <span
              key={slot}
              className="text-[10px] px-1.5 py-0.5 rounded font-mono"
              style={{
                background: "var(--bg-tertiary)",
                color: "var(--text-secondary)",
              }}
              title={`${slot} = ${impl}`}
            >
              <span className="text-[var(--text-muted)]">{slot}</span>
              <span className="mx-0.5 text-[var(--text-muted)]">=</span>
              {impl}
            </span>
          ))}
        </div>
      )}

      {configEntries.length > 0 && (
        <details className="text-[10px] mt-1">
          <summary className="cursor-pointer text-[var(--text-muted)] hover:text-[var(--text-secondary)]">
            config ({configEntries.length})
          </summary>
          <div className="mt-1 pl-2 space-y-0.5">
            {configEntries.map(([key, val]) => (
              <div key={key} className="flex justify-between gap-2">
                <span className="text-[var(--text-muted)] shrink-0">
                  {key}
                </span>
                <span className="font-mono text-[var(--text-secondary)] truncate">
                  {formatValue(val)}
                </span>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
};

const EnvironmentPreview: React.FC<EnvironmentPreviewProps> = ({ detail }) => {
  const manifest: EnvironmentManifest | null = detail.manifest ?? null;
  const snapshot = (detail.snapshot ?? null) as Record<string, unknown> | null;

  const model: Record<string, unknown> = manifest
    ? manifest.model
    : ((snapshot?.model_config ?? snapshot?.model ?? {}) as Record<
        string,
        unknown
      >);

  const pipeline: Record<string, unknown> = manifest
    ? manifest.pipeline
    : ((snapshot?.pipeline_config ?? snapshot?.pipeline ?? {}) as Record<
        string,
        unknown
      >);

  const stages = normalizeStages(manifest, snapshot);
  const activeCount = stages.filter((s) => s.active).length;
  const source = manifest ? "manifest v2" : "legacy snapshot";

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-[9px] uppercase tracking-wider text-[var(--text-muted)]">
        <span>source: {source}</span>
        <span>·</span>
        <span>
          {activeCount}/{stages.length} stages active
        </span>
        {manifest?.metadata?.base_preset && (
          <>
            <span>·</span>
            <span>
              base: {manifest.metadata.base_preset}
            </span>
          </>
        )}
      </div>

      <ModelSection model={model} />
      <PipelineSection pipeline={pipeline} />

      <section
        className="rounded-lg p-3"
        style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}
      >
        <h4
          className="text-[10px] font-semibold uppercase tracking-wider mb-2"
          style={{ color: "var(--accent)" }}
        >
          Stages ({activeCount} of {stages.length})
        </h4>
        {stages.length === 0 ? (
          <p className="text-xs italic text-[var(--text-muted)]">
            No stages recorded
          </p>
        ) : (
          <div className="space-y-1.5">
            {stages
              .slice()
              .sort((a, b) => a.order - b.order)
              .map((s) => (
                <StageRow key={s.order} stage={s} />
              ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default EnvironmentPreview;
