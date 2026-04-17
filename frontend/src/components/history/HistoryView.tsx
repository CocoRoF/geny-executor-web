/** HistoryView — main history view with tabs: runs, cost, A/B test. */
import React, { useEffect, useState } from 'react';
import { useHistoryStore } from '../../stores/historyStore';
import { UI_KO } from '../../locales/ko';
import ExecutionList from './ExecutionList';
import ExecutionDetail from './ExecutionDetail';
import CostDashboard from './CostDashboard';
import ABTestView from './ABTestView';

interface HistoryViewProps {
  sessionId: string | null;
}

type Tab = 'runs' | 'cost' | 'ab';

const HistoryView: React.FC<HistoryViewProps> = ({ sessionId }) => {
  const { loadHistory, error, clearError } = useHistoryStore();
  const [tab, setTab] = useState<Tab>('runs');

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // Reload when filters change
  const { filterModel, filterStatus, page } = useHistoryStore();
  useEffect(() => {
    loadHistory();
  }, [filterModel, filterStatus, page, loadHistory]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className="px-6 py-3 shrink-0 flex items-center justify-between"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <div>
          <span
            className="text-[10px] font-semibold uppercase tracking-[0.2em]"
            style={{ color: 'var(--accent)' }}
          >
            {UI_KO.executionHistory}
          </span>
          <h2
            className="text-lg font-bold leading-tight"
            style={{
              fontFamily: "'Playfair Display', serif",
              color: 'var(--text-primary)',
            }}
          >
            {tab === 'runs'
              ? UI_KO.executionRuns
              : tab === 'cost'
                ? UI_KO.costAnalysis
                : UI_KO.abTest}
          </h2>
        </div>

        {/* Tab buttons */}
        <div className="flex gap-1">
          {([
            ['runs', UI_KO.history],
            ['cost', UI_KO.costAnalysis],
            ['ab', UI_KO.abTest],
          ] as [Tab, string][]).map(([t, label]) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`text-[10px] px-3 py-1 rounded transition-colors ${
                tab === t
                  ? 'bg-[var(--accent)]/10 text-[var(--accent)] font-medium'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mx-4 mt-2 text-xs p-2 rounded bg-red-500/10 text-red-400 flex justify-between">
          <span>{error}</span>
          <button onClick={clearError} className="text-red-400 hover:text-red-300">
            ×
          </button>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {tab === 'runs' && (
          <div className="flex h-full">
            {/* Left: list */}
            <div
              className="w-80 shrink-0 overflow-hidden"
              style={{ borderRight: '1px solid var(--border)' }}
            >
              <ExecutionList />
            </div>
            {/* Right: detail */}
            <div className="flex-1 overflow-hidden">
              <ExecutionDetail />
            </div>
          </div>
        )}

        {tab === 'cost' && (
          <div className="h-full overflow-y-auto">
            <CostDashboard sessionId={sessionId ?? undefined} />
          </div>
        )}

        {tab === 'ab' && (
          <div className="h-full overflow-y-auto">
            <ABTestView />
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoryView;
