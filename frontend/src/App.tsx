import { useEffect } from "react";
import { usePipelineStore } from "./stores/pipelineStore";
import { useSessionStore } from "./stores/sessionStore";
import Header from "./components/layout/Header";
import PipelineView from "./components/pipeline/PipelineView";
import StageDetailPanel from "./components/pipeline/StageDetailPanel";
import CodeViewModal from "./components/pipeline/CodeViewModal";
import EventLog from "./components/execution/EventLog";
import InputPanel from "./components/execution/InputPanel";

export default function App() {
  const loadPipeline = usePipelineStore((s) => s.loadPipeline);
  const loadPresets = usePipelineStore((s) => s.loadPresets);
  const loadSessions = useSessionStore((s) => s.loadSessions);
  const checkConfig = useSessionStore((s) => s.checkConfig);

  useEffect(() => {
    checkConfig();
    loadPresets();
    loadPipeline("agent");
    loadSessions();
  }, [checkConfig, loadPresets, loadPipeline, loadSessions]);

  return (
    <div className="h-screen flex flex-col" style={{ background: "var(--bg-primary)" }}>
      <Header />

      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Left: Pipeline visualization */}
        <div
          className="flex-1 flex flex-col min-w-0"
          style={{ borderRight: "1px solid var(--border)" }}
        >
          <PipelineView />
        </div>

        {/* Right: Event log + inline result */}
        <div className="w-[380px] flex flex-col shrink-0 min-h-0" style={{ background: "var(--bg-secondary)" }}>
          <EventLog />
        </div>
      </div>

      {/* Bottom: Full-width input bar */}
      <InputPanel />

      <StageDetailPanel />
      <CodeViewModal />
    </div>
  );
}
