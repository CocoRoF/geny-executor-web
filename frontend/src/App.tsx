import { useEffect, useState } from "react";
import { usePipelineStore } from "./stores/pipelineStore";
import { useSessionStore } from "./stores/sessionStore";
import { useUIStore } from "./stores/uiStore";
import { useEditorStore } from "./stores/editorStore";
import Header from "./components/layout/Header";
import PipelineView from "./components/pipeline/PipelineView";
import StageDetailPanel from "./components/pipeline/StageDetailPanel";
import CodeViewModal from "./components/pipeline/CodeViewModal";
import EventLog from "./components/execution/EventLog";
import InputPanel from "./components/execution/InputPanel";
import CompareView from "./components/compare/CompareView";
import StageEditorPanel from "./components/editor/StageEditorPanel";
import ToolManagerView from "./components/tools/ToolManagerView";
import EnvironmentView from "./components/environment/EnvironmentView";
import HistoryView from "./components/history/HistoryView";
import { useEditorSync } from "./hooks/useEditorSync";

export default function App() {
  const loadPipeline = usePipelineStore((s) => s.loadPipeline);
  const loadPresets = usePipelineStore((s) => s.loadPresets);
  const loadSessions = useSessionStore((s) => s.loadSessions);
  const checkConfig = useSessionStore((s) => s.checkConfig);
  const activeSessionId = useSessionStore((s) => s.activeSessionId);
  const viewMode = useUIStore((s) => s.viewMode);
  const selectedStageOrder = useUIStore((s) => s.selectedStageOrder);
  const selectStage = useUIStore((s) => s.selectStage);
  const editMode = useEditorStore((s) => s.editMode);

  const [editorStageOrder, setEditorStageOrder] = useState<number | null>(null);

  useEffect(() => {
    checkConfig();
    loadPresets();
    loadPipeline("agent");
    loadSessions();
  }, [checkConfig, loadPresets, loadPipeline, loadSessions]);

  // Open editor panel on stage click in edit mode
  useEffect(() => {
    if (editMode && selectedStageOrder !== null) {
      setEditorStageOrder(selectedStageOrder);
    }
  }, [editMode, selectedStageOrder]);

  const sessionId = activeSessionId ?? "default";

  // Real-time editor sync via WebSocket
  useEditorSync(editMode ? sessionId : null);

  return (
    <div className="h-screen flex flex-col" style={{ background: "var(--bg-primary)" }}>
      <Header />

      {viewMode === "compare" ? (
        /* Compare mode: full-width compare view with its own input */
        <CompareView />
      ) : viewMode === "tools" ? (
        <div className="flex-1 overflow-hidden">
          <ToolManagerView sessionId={sessionId} />
        </div>
      ) : viewMode === "environment" ? (
        <div className="flex-1 overflow-hidden">
          <EnvironmentView sessionId={sessionId} />
        </div>
      ) : viewMode === "history" ? (
        <div className="flex-1 overflow-hidden">
          <HistoryView sessionId={activeSessionId} />
        </div>
      ) : (
        /* Single engine mode: pipeline + event log + input */
        <>
          <div className="flex-1 flex overflow-hidden min-h-0">
            {/* Left: Pipeline visualization */}
            <div
              className="flex-1 flex flex-col min-w-0"
              style={{ borderRight: "1px solid var(--border)" }}
            >
              <PipelineView />
            </div>

            {/* Right: Stage editor panel (edit mode) or Event log */}
            {editMode && editorStageOrder !== null ? (
              <StageEditorPanel
                sessionId={sessionId}
                stageOrder={editorStageOrder}
                onClose={() => {
                  setEditorStageOrder(null);
                  selectStage(null);
                }}
              />
            ) : (
              <div className="w-[380px] flex flex-col shrink-0 min-h-0" style={{ background: "var(--bg-secondary)" }}>
                <EventLog />
              </div>
            )}
          </div>

          {/* Bottom: Full-width input bar */}
          <InputPanel />

          <StageDetailPanel />
          <CodeViewModal />
        </>
      )}
    </div>
  );
}
