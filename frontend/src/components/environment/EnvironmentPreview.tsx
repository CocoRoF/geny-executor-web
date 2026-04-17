/* EnvironmentPreview — quick preview of an environment's configuration */
import React from "react";
import type { EnvironmentDetail } from "../../types/editor";

interface EnvironmentPreviewProps {
  detail: EnvironmentDetail;
}

const EnvironmentPreview: React.FC<EnvironmentPreviewProps> = ({ detail }) => {
  const snapshot = detail.snapshot ?? {};
  const model = (snapshot.model_config ?? snapshot.model ?? {}) as Record<string, unknown>;
  const pipeline = (snapshot.pipeline_config ?? snapshot.pipeline ?? {}) as Record<string, unknown>;
  const stages = (snapshot.stages ?? []) as Record<string, unknown>[];

  return (
    <div className="space-y-3">
      {/* Model config */}
      <div
        className="rounded-lg p-3"
        style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}
      >
        <h4
          className="text-[10px] font-semibold uppercase tracking-wider mb-2"
          style={{ color: "var(--accent)" }}
        >
          Model
        </h4>
        <div className="space-y-1">
          {Object.entries(model).map(([key, val]) => (
            <div key={key} className="flex justify-between text-xs">
              <span className="text-[var(--text-muted)]">{key}</span>
              <span className="font-mono text-[var(--text-secondary)]">
                {String(val)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Pipeline config */}
      <div
        className="rounded-lg p-3"
        style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}
      >
        <h4
          className="text-[10px] font-semibold uppercase tracking-wider mb-2"
          style={{ color: "var(--accent)" }}
        >
          Pipeline
        </h4>
        <div className="space-y-1">
          {Object.entries(pipeline).map(([key, val]) => (
            <div key={key} className="flex justify-between text-xs">
              <span className="text-[var(--text-muted)]">{key}</span>
              <span className="font-mono text-[var(--text-secondary)]">
                {String(val)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Stage summary */}
      <div
        className="rounded-lg p-3"
        style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}
      >
        <h4
          className="text-[10px] font-semibold uppercase tracking-wider mb-2"
          style={{ color: "var(--accent)" }}
        >
          Stages ({stages.length})
        </h4>
        <div className="flex flex-wrap gap-1">
          {stages.map((s, i) => {
            const active =
              s.is_active !== undefined ? Boolean(s.is_active) : Boolean(s.active);
            return (
              <span
                key={i}
                className="text-[10px] px-2 py-0.5 rounded font-mono"
                style={{
                  background: active ? "var(--bg-tertiary)" : "transparent",
                  color: active ? "var(--text-primary)" : "var(--text-muted)",
                  border: `1px solid ${active ? "var(--border)" : "transparent"}`,
                  opacity: active ? 1 : 0.5,
                }}
              >
                {String(s.name ?? `S${s.order}`)}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default EnvironmentPreview;
