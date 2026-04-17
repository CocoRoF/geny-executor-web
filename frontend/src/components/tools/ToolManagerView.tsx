/* ToolManagerView — top-level tool management page with tabs */
import React, { useEffect, useState } from "react";
import { useToolStore } from "../../stores/toolStore";
import ToolCard from "./ToolCard";
import ToolTester from "./ToolTester";
import AdhocToolEditor from "./AdhocToolEditor";
import MCPServerManager from "./MCPServerManager";
import ToolPresetSelector from "./ToolPresetSelector";
import ToolScopeEditor from "./ToolScopeEditor";

interface ToolManagerViewProps {
  sessionId: string;
}

type SubView = "list" | "adhoc" | "mcp" | "presets" | "scope";

const ToolManagerView: React.FC<ToolManagerViewProps> = ({ sessionId }) => {
  const { tools, loadTools, deleteTool } = useToolStore();
  const [subView, setSubView] = useState<SubView>("list");
  const [testingTool, setTestingTool] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadTools(sessionId);
  }, [sessionId, loadTools]);

  const filtered = tools.filter((t) => {
    if (filterType !== "all" && t.type !== filterType) return false;
    if (search && !t.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const NAV_ITEMS: { key: SubView; label: string }[] = [
    { key: "list", label: "Tools" },
    { key: "adhoc", label: "+ Ad-hoc" },
    { key: "mcp", label: "MCP" },
    { key: "presets", label: "Presets" },
    { key: "scope", label: "Scope" },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Top nav */}
      <div className="flex items-center border-b border-[var(--border-primary)] px-4">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.key}
            className={`text-xs py-2.5 px-3 transition-colors ${
              subView === item.key
                ? "text-[var(--accent)] border-b-2 border-[var(--accent)] font-medium"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
            onClick={() => setSubView(item.key)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {subView === "list" && (
          <div className="p-4 space-y-3">
            {/* Search + filter */}
            <div className="flex gap-2">
              <input
                className="flex-1 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded px-2 py-1.5 text-sm text-[var(--text-primary)]"
                placeholder="Search tools..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <select
                className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded px-2 py-1.5 text-sm text-[var(--text-primary)]"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
              >
                <option value="all">All types</option>
                <option value="built_in">Built-in</option>
                <option value="adhoc">Ad-hoc</option>
                <option value="mcp">MCP</option>
              </select>
            </div>

            <p className="text-xs text-[var(--text-muted)]">
              {filtered.length} tool{filtered.length !== 1 ? "s" : ""}
            </p>

            {/* Test panel */}
            {testingTool && (
              <ToolTester
                sessionId={sessionId}
                toolName={testingTool}
                onClose={() => setTestingTool(null)}
              />
            )}

            {/* Tool cards */}
            <div className="space-y-2">
              {filtered.map((t) => (
                <ToolCard
                  key={t.name}
                  tool={t}
                  onTest={() => setTestingTool(t.name)}
                  onDelete={
                    t.type === "adhoc"
                      ? () => deleteTool(sessionId, t.name)
                      : undefined
                  }
                />
              ))}
              {filtered.length === 0 && (
                <p className="text-xs text-[var(--text-muted)] italic text-center py-8">
                  No tools match your filters
                </p>
              )}
            </div>
          </div>
        )}

        {subView === "adhoc" && (
          <AdhocToolEditor
            sessionId={sessionId}
            onComplete={() => {
              loadTools(sessionId);
              setSubView("list");
            }}
            onCancel={() => setSubView("list")}
          />
        )}

        {subView === "mcp" && (
          <MCPServerManager
            sessionId={sessionId}
            onBack={() => setSubView("list")}
          />
        )}

        {subView === "presets" && (
          <div className="p-4">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">
              Tool Presets
            </h3>
            <ToolPresetSelector sessionId={sessionId} />
          </div>
        )}

        {subView === "scope" && (
          <div className="p-4">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">
              Tool Scope Rules
            </h3>
            <ToolScopeEditor sessionId={sessionId} />
          </div>
        )}
      </div>
    </div>
  );
};

export default ToolManagerView;
