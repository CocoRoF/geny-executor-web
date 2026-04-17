/** DebugPanel — breakpoint management and step execution. */
import React from 'react';
import { UI_KO } from '../../locales/ko';

interface Breakpoint {
  stageOrder: number;
  stageName: string;
  enabled: boolean;
}

interface StageSnapshot {
  stage_order: number;
  stage_name: string;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  metadata: Record<string, unknown>;
}

interface Props {
  breakpoints: Breakpoint[];
  snapshot: StageSnapshot | null;
  isPaused: boolean;
  onContinue: () => void;
  onStepNext: () => void;
  onToggleBreakpoint: (stageOrder: number) => void;
  onRemoveBreakpoint: (stageOrder: number) => void;
}

const DebugPanel: React.FC<Props> = ({
  breakpoints,
  snapshot,
  isPaused,
  onContinue,
  onStepNext,
  onToggleBreakpoint,
  onRemoveBreakpoint,
}) => {
  return (
    <div className="bg-[var(--bg-secondary)] rounded-lg p-3 space-y-3">
      <h4
        className="text-[10px] font-semibold uppercase tracking-[0.15em]"
        style={{ color: 'var(--accent)' }}
      >
        {UI_KO.debug}
      </h4>

      {/* Execution controls */}
      {isPaused && (
        <div className="flex gap-2">
          <button
            onClick={onContinue}
            className="text-[10px] px-3 py-1 rounded font-medium transition-colors"
            style={{ background: 'var(--accent)', color: 'var(--bg-primary)' }}
          >
            ▶ {UI_KO.continueExec}
          </button>
          <button
            onClick={onStepNext}
            className="text-[10px] px-3 py-1 rounded font-medium bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            ⏭ {UI_KO.stepNext}
          </button>
        </div>
      )}

      {/* Breakpoints list */}
      <div>
        <h5 className="text-[9px] text-[var(--text-muted)] uppercase tracking-wider mb-1">
          {UI_KO.breakpoint}s ({breakpoints.length})
        </h5>
        {breakpoints.length === 0 ? (
          <p className="text-[10px] text-[var(--text-muted)] italic">
            No breakpoints set
          </p>
        ) : (
          <div className="space-y-1">
            {breakpoints.map((bp) => (
              <div
                key={bp.stageOrder}
                className="flex items-center justify-between px-2 py-1 rounded bg-[var(--bg-primary)]"
              >
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onToggleBreakpoint(bp.stageOrder)}
                    className={`w-2.5 h-2.5 rounded-full border ${
                      bp.enabled
                        ? 'bg-red-500 border-red-500'
                        : 'bg-transparent border-[var(--border)]'
                    }`}
                  />
                  <span className="text-[10px] text-[var(--text-secondary)]">
                    Stage {bp.stageOrder}: {bp.stageName}
                  </span>
                </div>
                <button
                  onClick={() => onRemoveBreakpoint(bp.stageOrder)}
                  className="text-[10px] text-[var(--text-muted)] hover:text-red-400"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Stage snapshot */}
      {snapshot && (
        <div>
          <h5 className="text-[9px] text-[var(--text-muted)] uppercase tracking-wider mb-1">
            Stage Snapshot: {snapshot.stage_name}
          </h5>
          <div className="space-y-1.5">
            <SnapshotSection label="Input" data={snapshot.input} />
            <SnapshotSection label="Output" data={snapshot.output} />
            {Object.keys(snapshot.metadata).length > 0 && (
              <SnapshotSection label="Metadata" data={snapshot.metadata} />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const SnapshotSection: React.FC<{ label: string; data: Record<string, unknown> }> = ({
  label,
  data,
}) => (
  <div>
    <span className="text-[8px] uppercase text-[var(--text-muted)] font-semibold">
      {label}
    </span>
    <pre className="text-[9px] font-mono text-[var(--text-secondary)] bg-[var(--bg-tertiary)] p-2 rounded mt-0.5 max-h-32 overflow-auto">
      {JSON.stringify(data, null, 2)}
    </pre>
  </div>
);

export default DebugPanel;
