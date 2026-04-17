/* EnvironmentBuilder — full-pane shell that composes the template editor.
 *
 * Layout:
 *   ┌──────────────────────────────────────────────────────────┐
 *   │ Header: name · actions (duplicate / instantiate / close) │
 *   ├─────────────┬────────────────────────────────────────────┤
 *   │ StageList   │ StageCard                                  │
 *   │ (16 rows)   │ (4 tabs)                                   │
 *   └─────────────┴────────────────────────────────────────────┘
 *
 * Owns: catalog bootstrap, "New environment" modal, duplicate prompt,
 * and the Instantiate → session-creation handoff. Everything stage-level
 * lives in StageList + StageCard; everything cross-stage lives here.
 */
import React from "react";

import { createSessionFromEnv } from "../../api/session";
import {
  selectActiveStage,
  useEnvironmentBuilderStore,
} from "../../stores/environmentBuilderStore";
import { useSessionStore } from "../../stores/sessionStore";
import { useUIStore } from "../../stores/uiStore";
import type {
  CreateEnvironmentPayload,
  StageManifestEntry,
} from "../../types/environment";
import CreateEnvironmentModal from "./CreateEnvironmentModal";
import StageCard from "./StageCard";
import StageList from "./StageList";

interface EnvironmentBuilderProps {
  /** Environment to open immediately (usually from an "Edit in Builder" click). */
  initialEnvId?: string | null;
  /** Hook so the parent view can switch modes when the user closes. */
  onClose?: () => void;
}

const EnvironmentBuilder: React.FC<EnvironmentBuilderProps> = ({
  initialEnvId,
  onClose,
}) => {
  const {
    loadCatalog,
    catalogLoaded,
    catalogLoading,
    activeEnvId,
    activeDetail,
    error,
    saving,
    loadTemplate,
    closeTemplate,
    createTemplate,
    duplicate,
    clearError,
  } = useEnvironmentBuilderStore();

  const activeStage = useEnvironmentBuilderStore(selectActiveStage);
  const setActiveSession = useSessionStore((s) => s.setActiveSession);
  const loadSessions = useSessionStore((s) => s.loadSessions);
  const setViewMode = useUIStore((s) => s.setViewMode);

  const [showCreate, setShowCreate] = React.useState(false);
  const [instantiating, setInstantiating] = React.useState(false);
  const [instantiateError, setInstantiateError] = React.useState<string | null>(
    null
  );

  React.useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  React.useEffect(() => {
    if (initialEnvId && initialEnvId !== activeEnvId) {
      void loadTemplate(initialEnvId);
    }
  }, [initialEnvId, activeEnvId, loadTemplate]);

  const stages: StageManifestEntry[] = React.useMemo(() => {
    const list = activeDetail?.manifest?.stages ?? [];
    return [...list].sort((a, b) => a.order - b.order);
  }, [activeDetail]);

  const handleCreate = async (payload: CreateEnvironmentPayload) => {
    await createTemplate(payload);
    setShowCreate(false);
  };

  const handleDuplicate = async () => {
    const base = activeDetail?.name ?? "environment";
    const nextName = window.prompt("Name for the copy", `${base} (copy)`);
    if (!nextName) return;
    const newId = await duplicate(nextName.trim());
    if (newId) await loadTemplate(newId);
  };

  const handleInstantiate = async () => {
    if (!activeEnvId) return;
    setInstantiating(true);
    setInstantiateError(null);
    try {
      const res = await createSessionFromEnv(activeEnvId);
      await loadSessions();
      setActiveSession(res.session_id);
      setViewMode("pipeline");
    } catch (e) {
      setInstantiateError(String(e));
    } finally {
      setInstantiating(false);
    }
  };

  const handleClose = () => {
    closeTemplate();
    onClose?.();
  };

  // ── Render branches ──────────────────────────────────────

  if (!catalogLoaded && catalogLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-xs text-[var(--text-muted)] animate-pulse">
          Loading stage catalog…
        </p>
      </div>
    );
  }

  if (!activeDetail || !activeDetail.manifest) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="text-center space-y-4 max-w-md">
          <div>
            <span
              className="text-[10px] font-semibold uppercase tracking-[0.2em]"
              style={{ color: "var(--accent)" }}
            >
              Environment Builder
            </span>
            <h2
              className="text-2xl font-bold mt-1"
              style={{
                fontFamily: "'Playfair Display', serif",
                color: "var(--text-primary)",
              }}
            >
              Compose a pipeline
            </h2>
            <p className="text-xs text-[var(--text-secondary)] mt-2 leading-relaxed">
              Pick an artifact for each of the 16 stages, tune its config, bind
              tools, override models, and save the result as a reusable
              template.
            </p>
          </div>
          <div className="flex gap-2 justify-center">
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="text-xs px-4 py-2 rounded"
              style={{ background: "var(--accent)", color: "#000" }}
            >
              New environment
            </button>
            {onClose && (
              <button
                type="button"
                onClick={handleClose}
                className="text-xs px-4 py-2 rounded"
                style={{
                  background: "var(--bg-tertiary)",
                  color: "var(--text-secondary)",
                  border: "1px solid var(--border)",
                }}
              >
                Back
              </button>
            )}
          </div>
          {error && (
            <p className="text-[11px] text-red-400">
              {error}{" "}
              <button
                className="underline"
                onClick={clearError}
                type="button"
              >
                dismiss
              </button>
            </p>
          )}
        </div>
        {showCreate && (
          <CreateEnvironmentModal
            onCreate={handleCreate}
            onClose={() => setShowCreate(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header
        className="px-4 py-3 flex items-center justify-between shrink-0"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <div className="min-w-0">
          <span
            className="text-[10px] font-semibold uppercase tracking-[0.2em]"
            style={{ color: "var(--accent)" }}
          >
            Environment Builder
          </span>
          <h2
            className="text-lg font-bold leading-tight truncate"
            style={{
              fontFamily: "'Playfair Display', serif",
              color: "var(--text-primary)",
            }}
          >
            {activeDetail.name}
          </h2>
          {activeDetail.description && (
            <p className="text-[11px] text-[var(--text-muted)] truncate">
              {activeDetail.description}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {saving && (
            <span className="text-[10px] text-[var(--text-muted)] italic">
              Saving…
            </span>
          )}
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="text-[10px] px-3 py-1 rounded"
            style={{
              background: "var(--bg-tertiary)",
              color: "var(--text-secondary)",
              border: "1px solid var(--border)",
            }}
          >
            New
          </button>
          <button
            type="button"
            onClick={handleDuplicate}
            className="text-[10px] px-3 py-1 rounded"
            style={{
              background: "var(--bg-tertiary)",
              color: "var(--text-secondary)",
              border: "1px solid var(--border)",
            }}
          >
            Duplicate
          </button>
          <button
            type="button"
            onClick={handleInstantiate}
            disabled={instantiating}
            className="text-[10px] px-3 py-1 rounded disabled:opacity-40"
            style={{ background: "var(--accent)", color: "#000" }}
          >
            {instantiating ? "Starting…" : "Start session"}
          </button>
          {onClose && (
            <button
              type="button"
              onClick={handleClose}
              className="text-[10px] px-3 py-1 rounded"
              style={{
                background: "var(--bg-tertiary)",
                color: "var(--text-secondary)",
                border: "1px solid var(--border)",
              }}
            >
              Close
            </button>
          )}
        </div>
      </header>

      {/* Errors banner */}
      {(error || instantiateError) && (
        <div className="px-4 py-2 text-[11px] text-red-400 flex justify-between items-center bg-red-500/10 shrink-0">
          <span>{error ?? instantiateError}</span>
          <button
            type="button"
            onClick={() => {
              clearError();
              setInstantiateError(null);
            }}
            className="underline text-red-300"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Body: stage list + stage card */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        <div
          className="w-72 shrink-0 overflow-y-auto"
          style={{ borderRight: "1px solid var(--border)" }}
        >
          <StageList stages={stages} />
        </div>
        <div className="flex-1 min-w-0 overflow-hidden">
          {activeStage ? (
            <StageCard stage={activeStage} />
          ) : (
            <div className="h-full flex items-center justify-center p-8">
              <p className="text-xs italic text-[var(--text-muted)]">
                Select a stage on the left to edit it.
              </p>
            </div>
          )}
        </div>
      </div>

      {showCreate && (
        <CreateEnvironmentModal
          onCreate={handleCreate}
          onClose={() => setShowCreate(false)}
        />
      )}
    </div>
  );
};

export default EnvironmentBuilder;
