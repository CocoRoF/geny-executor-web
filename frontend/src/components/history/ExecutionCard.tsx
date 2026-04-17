/** ExecutionCard — compact card for one execution run. */
import React from 'react';
import type { ExecutionSummary } from '../../types/history';

const STATUS_COLORS: Record<string, string> = {
  completed: 'text-emerald-400',
  running: 'text-blue-400',
  error: 'text-red-400',
  cancelled: 'text-gray-400',
};

interface Props {
  run: ExecutionSummary;
  selected: boolean;
  onSelect: () => void;
}

const ExecutionCard: React.FC<Props> = ({ run, selected, onSelect }) => (
  <button
    onClick={onSelect}
    className={`w-full text-left px-3 py-2.5 rounded-lg border transition-colors ${
      selected
        ? 'border-[var(--accent)] bg-[var(--accent)]/5'
        : 'border-[var(--border)] hover:bg-[var(--bg-tertiary)]'
    }`}
  >
    <div className="flex items-center justify-between mb-1">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-xs font-mono text-[var(--text-muted)]">
          #{run.id.slice(0, 8)}
        </span>
        <span className={`text-xs font-medium ${STATUS_COLORS[run.status] ?? 'text-[var(--text-secondary)]'}`}>
          {run.status}
        </span>
      </div>
      <span className="text-[10px] text-[var(--text-muted)]">
        {new Date(run.created_at).toLocaleString()}
      </span>
    </div>

    <div className="flex items-center gap-3 text-[10px] text-[var(--text-muted)]">
      {run.model && (
        <span className="px-1.5 py-0.5 rounded bg-[var(--bg-tertiary)] font-mono">
          {run.model.replace('claude-', '').slice(0, 12)}
        </span>
      )}
      {run.duration_ms > 0 && <span>{(run.duration_ms / 1000).toFixed(1)}s</span>}
      {run.total_cost_usd > 0 && <span>${run.total_cost_usd.toFixed(4)}</span>}
      {run.iterations > 0 && <span>{run.iterations} iter</span>}
      {run.total_tokens > 0 && <span>{(run.total_tokens / 1000).toFixed(1)}k tok</span>}
    </div>

    {run.input_text && (
      <p className="mt-1 text-[11px] text-[var(--text-secondary)] truncate">
        {run.input_text.slice(0, 80)}
      </p>
    )}
  </button>
);

export default ExecutionCard;
