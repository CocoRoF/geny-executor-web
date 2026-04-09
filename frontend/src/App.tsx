import { useEffect } from "react";
import { usePipelineStore } from "./stores/pipelineStore";
import { useSessionStore } from "./stores/sessionStore";
import Header from "./components/layout/Header";
import PipelineView from "./components/pipeline/PipelineView";
import StageDetailPanel from "./components/pipeline/StageDetailPanel";
import EventLog from "./components/execution/EventLog";
import ResultPanel from "./components/execution/ResultPanel";
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

      <div className="flex-1 flex overflow-hidden">
        {/* Left: Pipeline visualization */}
        <div
          className="flex-1 flex flex-col min-w-0"
          style={{ borderRight: "1px solid var(--border)" }}
        >
          <div className="flex-1 min-h-0">
            <PipelineView />
          </div>
          <InputPanel />
        </div>

        {/* Right: Event log */}
        <div className="w-[380px] flex flex-col shrink-0" style={{ background: "var(--bg-secondary)" }}>
          <EventLog />
          <ResultPanel />
        </div>
      </div>

      <StageDetailPanel />
    </div>
  );
}
