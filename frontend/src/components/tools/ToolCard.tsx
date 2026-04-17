/* ToolCard — displays a single tool in the tool list */
import React from "react";
import type { ToolInfo } from "../../types/editor";

interface ToolCardProps {
  tool: ToolInfo;
  onTest: () => void;
  onDelete?: () => void;
}

const TYPE_BADGE: Record<string, { bg: string; text: string }> = {
  built_in: { bg: "bg-blue-500/15", text: "text-blue-400" },
  adhoc: { bg: "bg-amber-500/15", text: "text-amber-400" },
  mcp: { bg: "bg-purple-500/15", text: "text-purple-400" },
};

const ToolCard: React.FC<ToolCardProps> = ({ tool, onTest, onDelete }) => {
  const badge = TYPE_BADGE[tool.type] ?? TYPE_BADGE.built_in;

  return (
    <div className="border border-[var(--border-primary)] rounded-lg p-3 hover:border-[var(--accent)]/30 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-[var(--text-primary)] truncate">
              {tool.name}
            </span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${badge.bg} ${badge.text}`}
            >
              {tool.type}
            </span>
          </div>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5 line-clamp-2">
            {tool.description}
          </p>
          {tool.tags.length > 0 && (
            <div className="flex gap-1 mt-1.5 flex-wrap">
              {tool.tags.map((t) => (
                <span
                  key={t}
                  className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-tertiary)] text-[var(--text-muted)]"
                >
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex flex-col gap-1 shrink-0">
          <button
            className="text-[10px] px-2 py-1 rounded bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            onClick={onTest}
          >
            Test
          </button>
          {tool.type === "adhoc" && onDelete && (
            <button
              className="text-[10px] px-2 py-1 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20"
              onClick={onDelete}
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ToolCard;
