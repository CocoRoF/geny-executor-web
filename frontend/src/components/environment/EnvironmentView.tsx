/* EnvironmentView — manage saved pipeline environments (Phase 5) */
import React, { useEffect, useState } from "react";
import { useEnvironmentStore } from "../../stores/environmentStore";
import EnvironmentCard from "./EnvironmentCard";
import EnvironmentSaveModal from "./EnvironmentSaveModal";
import EnvironmentImport from "./EnvironmentImport";
import EnvironmentDiffView from "./EnvironmentDiffView";
import EnvironmentShareModal from "./EnvironmentShareModal";
import EnvironmentPreview from "./EnvironmentPreview";

interface EnvironmentViewProps {
  sessionId: string;
}

const EnvironmentView: React.FC<EnvironmentViewProps> = ({ sessionId }) => {
  const {
    environments,
    loading,
    error,
    selectedEnvId,
    selectedDetail,
    diffResult,
    loadEnvironments,
    save,
    loadDetail,
    remove,
    exportEnv,
    importEnv,
    computeDiff,
    clearDiff,
    selectEnv,
    clearError,
  } = useEnvironmentStore();

  const [showSave, setShowSave] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [shareEnvId, setShareEnvId] = useState<string | null>(null);
  const [diffMode, setDiffMode] = useState(false);
  const [diffBaseId, setDiffBaseId] = useState<string | null>(null);

  useEffect(() => {
    loadEnvironments();
  }, [loadEnvironments]);

  // Load detail when a card is selected
  useEffect(() => {
    if (selectedEnvId) {
      loadDetail(selectedEnvId);
    }
  }, [selectedEnvId, loadDetail]);

  const handleDiff = (envId: string) => {
    if (!diffMode) {
      setDiffMode(true);
      setDiffBaseId(envId);
    } else if (diffBaseId && diffBaseId !== envId) {
      computeDiff(diffBaseId, envId);
      setDiffMode(false);
      setDiffBaseId(null);
    }
  };

  const handleSave = async (name: string, description: string, tags: string[]) => {
    await save(sessionId, name, description, tags);
  };

  const handleImport = async (data: Record<string, unknown>) => {
    await importEnv(data);
  };

  const shareEnvName =
    shareEnvId ? environments.find((e) => e.id === shareEnvId)?.name ?? "" : "";

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className="px-6 py-3 flex items-center justify-between shrink-0"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <div>
          <span
            className="text-[10px] font-semibold uppercase tracking-[0.2em]"
            style={{ color: "var(--accent)" }}
          >
            Environments
          </span>
          <h2
            className="text-lg font-bold leading-tight"
            style={{
              fontFamily: "'Playfair Display', serif",
              color: "var(--text-primary)",
            }}
          >
            Saved Configurations
          </h2>
        </div>
        <div className="flex gap-2">
          <button
            className="text-[10px] px-3 py-1 rounded-md transition-colors hover:brightness-125"
            style={{
              background: "var(--bg-tertiary)",
              color: "var(--accent)",
              border: "1px solid var(--border)",
            }}
            onClick={() => setShowImport(true)}
          >
            Import
          </button>
          <button
            className="text-[10px] px-3 py-1 rounded-md transition-colors hover:brightness-125"
            style={{ background: "var(--accent)", color: "#000" }}
            onClick={() => setShowSave(true)}
          >
            Save Current
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left: Environment list */}
        <div
          className="w-80 shrink-0 overflow-y-auto p-4 space-y-3"
          style={{ borderRight: "1px solid var(--border)" }}
        >
          {/* Diff mode indicator */}
          {diffMode && (
            <div
              className="text-xs p-2 rounded"
              style={{ background: "var(--accent)", color: "#000" }}
            >
              Select another environment to diff
              <button
                className="ml-2 underline"
                onClick={() => {
                  setDiffMode(false);
                  setDiffBaseId(null);
                }}
              >
                Cancel
              </button>
            </div>
          )}

          {/* Error */}
          {error && (
            <div
              className="text-xs p-2 rounded bg-red-500/10 text-red-400 flex justify-between items-center"
            >
              <span>{error}</span>
              <button className="text-red-300 underline" onClick={clearError}>
                Dismiss
              </button>
            </div>
          )}

          {loading ? (
            <p className="text-xs text-[var(--text-muted)] animate-pulse text-center py-8">
              Loading...
            </p>
          ) : environments.length === 0 ? (
            <p className="text-xs text-[var(--text-muted)] italic text-center py-8">
              No saved environments
            </p>
          ) : (
            environments.map((env) => (
              <EnvironmentCard
                key={env.id}
                env={env}
                selected={selectedEnvId === env.id}
                onSelect={selectEnv}
                onExport={exportEnv}
                onDelete={remove}
                onDiff={handleDiff}
              />
            ))
          )}
        </div>

        {/* Right: Detail / Preview */}
        <div className="flex-1 overflow-y-auto p-4">
          {selectedDetail ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3
                    className="text-base font-bold"
                    style={{
                      fontFamily: "'Playfair Display', serif",
                      color: "var(--text-primary)",
                    }}
                  >
                    {selectedDetail.name}
                  </h3>
                  {selectedDetail.description && (
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                      {selectedDetail.description}
                    </p>
                  )}
                </div>
                <button
                  className="text-[10px] px-3 py-1 rounded"
                  style={{
                    background: "var(--bg-tertiary)",
                    color: "var(--text-secondary)",
                    border: "1px solid var(--border)",
                  }}
                  onClick={() => setShareEnvId(selectedDetail.id)}
                >
                  Share
                </button>
              </div>

              {selectedDetail.tags.length > 0 && (
                <div className="flex gap-1">
                  {selectedDetail.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[9px] px-1.5 py-0.5 rounded"
                      style={{
                        background: tag === "preset" ? "var(--accent)" : "var(--bg-tertiary)",
                        color: tag === "preset" ? "#000" : "var(--text-muted)",
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <EnvironmentPreview detail={selectedDetail} />
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-xs text-[var(--text-muted)] italic">
                Select an environment to preview
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showSave && (
        <EnvironmentSaveModal onSave={handleSave} onClose={() => setShowSave(false)} />
      )}
      {showImport && (
        <EnvironmentImport onImport={handleImport} onClose={() => setShowImport(false)} />
      )}
      {diffResult && (
        <EnvironmentDiffView
          diff={diffResult}
          envAName={
            environments.find((e) => e.id === diffBaseId)?.name ?? "A"
          }
          envBName={
            environments.find((e) => e.id !== diffBaseId)?.name ?? "B"
          }
          onClose={clearDiff}
        />
      )}
      {shareEnvId && (
        <EnvironmentShareModal
          envId={shareEnvId}
          envName={shareEnvName}
          onClose={() => setShareEnvId(null)}
        />
      )}
    </div>
  );
};

export default EnvironmentView;
