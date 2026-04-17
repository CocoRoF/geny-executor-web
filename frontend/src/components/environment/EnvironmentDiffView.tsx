/* EnvironmentDiffView — side-by-side diff of two environments */
import React from "react";
import type { EnvironmentDiffResult, DiffEntry } from "../../types/editor";

interface EnvironmentDiffViewProps {
  diff: EnvironmentDiffResult;
  envAName: string;
  envBName: string;
  onClose: () => void;
}

function getBadgeStyle(changeType: string): { bg: string; color: string } {
  switch (changeType) {
    case "added":
      return { bg: "rgba(52, 211, 153, 0.15)", color: "#34d399" };
    case "removed":
      return { bg: "rgba(248, 113, 113, 0.15)", color: "#f87171" };
    case "changed":
      return { bg: "rgba(251, 191, 36, 0.15)", color: "#fbbf24" };
    default:
      return { bg: "var(--bg-tertiary)", color: "var(--text-muted)" };
  }
}

const EnvironmentDiffView: React.FC<EnvironmentDiffViewProps> = ({
  diff,
  envAName,
  envBName,
  onClose,
}) => {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.6)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl max-h-[80vh] rounded-xl flex flex-col"
        style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-3 shrink-0"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <div>
            <h3
              className="text-base font-bold"
              style={{
                fontFamily: "'Playfair Display', serif",
                color: "var(--text-primary)",
              }}
            >
              Environment Diff
            </h3>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              {envAName} vs {envBName}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex gap-2 text-[10px]">
              <span style={{ color: "#34d399" }}>+{diff.summary.added}</span>
              <span style={{ color: "#f87171" }}>-{diff.summary.removed}</span>
              <span style={{ color: "#fbbf24" }}>~{diff.summary.changed}</span>
            </div>
            <button
              className="text-xs px-3 py-1 rounded"
              style={{
                background: "var(--bg-tertiary)",
                color: "var(--text-secondary)",
                border: "1px solid var(--border)",
              }}
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4">
          {diff.identical ? (
            <p className="text-sm text-emerald-400 text-center py-8 italic">
              Environments are identical
            </p>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  <th className="text-left px-2 py-2 text-[var(--text-muted)] font-medium">
                    Path
                  </th>
                  <th className="text-left px-2 py-2 text-[var(--text-muted)] font-medium w-20">
                    Change
                  </th>
                  <th className="text-left px-2 py-2 text-[var(--text-muted)] font-medium">
                    {envAName}
                  </th>
                  <th className="text-left px-2 py-2 text-[var(--text-muted)] font-medium">
                    {envBName}
                  </th>
                </tr>
              </thead>
              <tbody>
                {diff.entries.map((entry, i) => {
                  const badge = getBadgeStyle(entry.change_type);
                  return (
                    <tr
                      key={i}
                      style={{ borderBottom: "1px solid var(--border)" }}
                    >
                      <td className="px-2 py-1.5 font-mono text-[var(--text-secondary)]">
                        {entry.path}
                      </td>
                      <td className="px-2 py-1.5">
                        <span
                          className="text-[9px] px-1.5 py-0.5 rounded font-semibold"
                          style={{ background: badge.bg, color: badge.color }}
                        >
                          {entry.change_type}
                        </span>
                      </td>
                      <td className="px-2 py-1.5 font-mono text-[var(--text-muted)] max-w-[200px] truncate">
                        {entry.old_value !== null && entry.old_value !== undefined
                          ? JSON.stringify(entry.old_value)
                          : "—"}
                      </td>
                      <td className="px-2 py-1.5 font-mono text-[var(--text-muted)] max-w-[200px] truncate">
                        {entry.new_value !== null && entry.new_value !== undefined
                          ? JSON.stringify(entry.new_value)
                          : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default EnvironmentDiffView;
