/* StageEditorPanel — main right-sidebar editor for a selected stage */
import React, { useEffect, useState } from "react";
import { useEditorStore } from "../../stores/editorStore";
import StrategySelector from "./StrategySelector";
import ConfigForm from "./ConfigForm";
import MutationHistory from "./MutationHistory";
import ModelConfigEditor from "./ModelConfigEditor";

interface StageEditorPanelProps {
  sessionId: string;
  stageOrder: number;
  onClose: () => void;
}

type Tab = "strategy" | "config" | "model" | "history";

const StageEditorPanel: React.FC<StageEditorPanelProps> = ({
  sessionId,
  stageOrder,
  onClose,
}) => {
  const {
    stageDetails,
    stageDetailsLoading,
    loadStageDetail,
    swapStrategy,
    updateStageConfig,
    setStageActive,
    lastResult,
  } = useEditorStore();

  const [activeTab, setActiveTab] = useState<Tab>("strategy");
  const [configDraft, setConfigDraft] = useState<Record<string, unknown>>({});

  const stage = stageDetails[stageOrder];

  useEffect(() => {
    loadStageDetail(sessionId, stageOrder);
  }, [sessionId, stageOrder, loadStageDetail]);

  useEffect(() => {
    if (stage) setConfigDraft(stage.current_config);
  }, [stage]);

  const handleSwap = async (
    slotName: string,
    newImpl: string,
    config?: Record<string, unknown>
  ) => {
    await swapStrategy(sessionId, stageOrder, slotName, newImpl, config);
  };

  const handleConfigSave = async () => {
    await updateStageConfig(sessionId, stageOrder, configDraft);
  };

  const handleToggleActive = async () => {
    if (stage) {
      await setStageActive(sessionId, stageOrder, !stage.is_active);
    }
  };

  const TABS: { key: Tab; label: string }[] = [
    { key: "strategy", label: "Strategies" },
    { key: "config", label: "Config" },
    { key: "model", label: "Model" },
    { key: "history", label: "History" },
  ];

  if (stageDetailsLoading && !stage) {
    return (
      <div className="w-[380px] h-full border-l border-[var(--border-primary)] bg-[var(--bg-primary)] flex items-center justify-center">
        <span className="text-sm text-[var(--text-muted)] animate-pulse">
          Loading...
        </span>
      </div>
    );
  }

  if (!stage) return null;

  return (
    <div className="w-[380px] h-full border-l border-[var(--border-primary)] bg-[var(--bg-primary)] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-primary)]">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-bold text-[var(--accent)] shrink-0">
            #{stage.order}
          </span>
          <span className="text-sm font-semibold text-[var(--text-primary)] truncate">
            {stage.name}
          </span>
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded shrink-0 ${
              stage.is_active
                ? "bg-emerald-500/20 text-emerald-400"
                : "bg-gray-500/20 text-gray-400"
            }`}
          >
            {stage.is_active ? "Active" : "Inactive"}
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Toggle active */}
          <button
            className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-1.5 py-0.5 rounded hover:bg-[var(--bg-tertiary)]"
            onClick={handleToggleActive}
            title={stage.is_active ? "Deactivate" : "Activate"}
          >
            {stage.is_active ? "⏸" : "▶"}
          </button>
          {/* Close */}
          <button
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-lg leading-none px-1"
            onClick={onClose}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[var(--border-primary)]">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`flex-1 text-xs py-2 text-center transition-colors ${
              activeTab === t.key
                ? "text-[var(--accent)] border-b-2 border-[var(--accent)] font-medium"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
            onClick={() => setActiveTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3">
        {activeTab === "strategy" && (
          <div>
            {stage.strategies.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)] italic">
                No strategy slots
              </p>
            ) : (
              stage.strategies.map((slot) => (
                <StrategySelector
                  key={slot.slot_name}
                  slot={slot}
                  onSwap={(impl, cfg) => handleSwap(slot.slot_name, impl, cfg)}
                />
              ))
            )}
          </div>
        )}

        {activeTab === "config" && (
          <div>
            <ConfigForm
              schema={stage.config_schema}
              values={configDraft}
              onChange={setConfigDraft}
            />
            {Object.keys(stage.config_schema?.properties ?? {}).length > 0 && (
              <button
                className="mt-3 w-full text-sm py-1.5 rounded bg-[var(--accent)] text-black font-medium hover:opacity-90"
                onClick={handleConfigSave}
              >
                Save Config
              </button>
            )}
          </div>
        )}

        {activeTab === "model" && (
          <ModelConfigEditor sessionId={sessionId} />
        )}

        {activeTab === "history" && (
          <MutationHistory sessionId={sessionId} />
        )}
      </div>

      {/* Bottom result bar */}
      {lastResult && (
        <div
          className={`px-3 py-2 text-xs border-t border-[var(--border-primary)] ${
            lastResult.success
              ? "bg-emerald-500/5 text-emerald-400"
              : "bg-red-500/5 text-red-400"
          }`}
        >
          {lastResult.message}
        </div>
      )}
    </div>
  );
};

export default StageEditorPanel;
