/* EnvironmentCard — compact card for a single environment */
import React from "react";
import type { EnvironmentSummary } from "../../types/editor";

interface EnvironmentCardProps {
  env: EnvironmentSummary;
  onSelect: (id: string) => void;
  onExport: (id: string) => void;
  onDelete: (id: string) => void;
  onCompare: (id: string) => void;
  selected?: boolean;
}

const EnvironmentCard: React.FC<EnvironmentCardProps> = ({
  env,
  onSelect,
  onExport,
  onDelete,
  onCompare,
  selected,
}) => {
  const isPreset = env.tags.includes("preset");

  return (
    <div
      className="border rounded-lg p-3 cursor-pointer transition-all hover:brightness-110"
      style={{
        borderColor: selected ? "var(--accent)" : "var(--border)",
        background: selected ? "var(--bg-tertiary)" : "var(--bg-secondary)",
      }}
      onClick={() => onSelect(env.id)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-[var(--text-primary)] truncate">
              {env.name}
            </span>
            {isPreset && (
              <span
                className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold"
                style={{ background: "var(--accent)", color: "#000" }}
              >
                PRESET
              </span>
            )}
          </div>
          {env.description && (
            <p className="text-xs text-[var(--text-secondary)] mt-0.5 line-clamp-2">
              {env.description}
            </p>
          )}
          <div className="flex items-center gap-3 mt-1.5">
            {env.model && (
              <span className="text-[10px] text-[var(--text-muted)] font-mono">
                {env.model}
              </span>
            )}
            <span className="text-[10px] text-[var(--text-muted)]">
              {env.stage_count} stages
            </span>
          </div>
          {env.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {env.tags
                .filter((t) => t !== "preset")
                .map((tag) => (
                  <span
                    key={tag}
                    className="text-[9px] px-1.5 py-0.5 rounded"
                    style={{
                      background: "var(--bg-tertiary)",
                      color: "var(--text-muted)",
                    }}
                  >
                    {tag}
                  </span>
                ))}
            </div>
          )}
          <p className="text-[10px] text-[var(--text-muted)] mt-1">
            {new Date(env.created_at).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-1 mt-2 pt-2" style={{ borderTop: "1px solid var(--border)" }}>
        <button
          className="text-[10px] px-2 py-1 rounded hover:brightness-125 transition-colors"
          style={{ background: "var(--bg-tertiary)", color: "var(--text-secondary)" }}
          onClick={(e) => {
            e.stopPropagation();
            onCompare(env.id);
          }}
        >
          Compare
        </button>
        <button
          className="text-[10px] px-2 py-1 rounded hover:brightness-125 transition-colors"
          style={{ background: "var(--bg-tertiary)", color: "var(--text-secondary)" }}
          onClick={(e) => {
            e.stopPropagation();
            onExport(env.id);
          }}
        >
          Export
        </button>
        <div className="flex-1" />
        <button
          className="text-[10px] px-2 py-1 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(env.id);
          }}
        >
          Delete
        </button>
      </div>
    </div>
  );
};

export default EnvironmentCard;
