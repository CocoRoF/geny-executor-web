/** ExecutionList — paginated list with filters. */
import React from 'react';
import { useHistoryStore } from '../../stores/historyStore';
import { UI_KO } from '../../locales/ko';
import ExecutionCard from './ExecutionCard';

const ExecutionList: React.FC = () => {
  const {
    runs,
    total,
    loading,
    selectedRunId,
    filterModel,
    filterStatus,
    page,
    pageSize,
    setFilter,
    setPage,
    selectRun,
    loadDetail,
  } = useHistoryStore();

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const handleSelect = (runId: string) => {
    selectRun(runId);
    loadDetail(runId);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Filters */}
      <div className="flex gap-2 px-3 py-2" style={{ borderBottom: '1px solid var(--border)' }}>
        <select
          value={filterModel}
          onChange={(e) => setFilter(e.target.value, filterStatus)}
          className="text-[11px] px-2 py-1 rounded bg-[var(--bg-secondary)] text-[var(--text-secondary)] border border-[var(--border)]"
        >
          <option value="">{UI_KO.allModels}</option>
          <option value="claude-sonnet-4-20250514">Sonnet 4</option>
          <option value="claude-opus-4-20250514">Opus 4</option>
          <option value="claude-haiku-35-20250620">Haiku 3.5</option>
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilter(filterModel, e.target.value)}
          className="text-[11px] px-2 py-1 rounded bg-[var(--bg-secondary)] text-[var(--text-secondary)] border border-[var(--border)]"
        >
          <option value="">{UI_KO.allStatuses}</option>
          <option value="completed">Completed</option>
          <option value="error">Error</option>
          <option value="running">Running</option>
        </select>

        <span className="ml-auto text-[10px] text-[var(--text-muted)] self-center">
          {total} runs
        </span>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {loading ? (
          <p className="text-xs text-[var(--text-muted)] animate-pulse text-center py-8">
            Loading...
          </p>
        ) : runs.length === 0 ? (
          <p className="text-xs text-[var(--text-muted)] italic text-center py-8">
            {UI_KO.noHistory}
          </p>
        ) : (
          runs.map((run) => (
            <ExecutionCard
              key={run.id}
              run={run}
              selected={run.id === selectedRunId}
              onSelect={() => handleSelect(run.id)}
            />
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div
          className="flex items-center justify-center gap-2 px-3 py-2"
          style={{ borderTop: '1px solid var(--border)' }}
        >
          <button
            disabled={page === 0}
            onClick={() => setPage(page - 1)}
            className="text-[11px] px-2 py-1 rounded border border-[var(--border)] disabled:opacity-30 hover:bg-[var(--bg-tertiary)]"
            style={{ color: 'var(--text-secondary)' }}
          >
            ←
          </button>
          <span className="text-[10px] text-[var(--text-muted)]">
            {page + 1} / {totalPages}
          </span>
          <button
            disabled={page >= totalPages - 1}
            onClick={() => setPage(page + 1)}
            className="text-[11px] px-2 py-1 rounded border border-[var(--border)] disabled:opacity-30 hover:bg-[var(--bg-tertiary)]"
            style={{ color: 'var(--text-secondary)' }}
          >
            →
          </button>
        </div>
      )}
    </div>
  );
};

export default ExecutionList;
