/** ABTestView — run and compare two environments side-by-side. */
import React, { useEffect, useState } from 'react';
import { useHistoryStore } from '../../stores/historyStore';
import { useEnvironmentStore } from '../../stores/environmentStore';
import { UI_KO } from '../../locales/ko';

const ABTestView: React.FC = () => {
  const { environments, loadEnvironments } = useEnvironmentStore();
  const { abComparison, loading, error, runABTest, clearError } = useHistoryStore();
  const [envA, setEnvA] = useState('');
  const [envB, setEnvB] = useState('');
  const [input, setInput] = useState('');

  useEffect(() => {
    if (environments.length === 0) loadEnvironments();
  }, [environments.length, loadEnvironments]);

  const handleRun = () => {
    if (!envA || !envB || !input.trim()) return;
    clearError();
    runABTest(envA, envB, input.trim());
  };

  return (
    <div className="space-y-4 p-4">
      <h3
        className="text-[10px] font-semibold uppercase tracking-[0.2em]"
        style={{ color: 'var(--accent)' }}
      >
        {UI_KO.abTest}
      </h3>

      {/* Environment selectors */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] text-[var(--text-muted)] block mb-1">
            {UI_KO.selectEnvA}
          </label>
          <select
            value={envA}
            onChange={(e) => setEnvA(e.target.value)}
            className="w-full text-[11px] px-2 py-1.5 rounded bg-[var(--bg-secondary)] text-[var(--text-secondary)] border border-[var(--border)]"
          >
            <option value="">—</option>
            {environments.map((env) => (
              <option key={env.id} value={env.id}>
                {env.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[10px] text-[var(--text-muted)] block mb-1">
            {UI_KO.selectEnvB}
          </label>
          <select
            value={envB}
            onChange={(e) => setEnvB(e.target.value)}
            className="w-full text-[11px] px-2 py-1.5 rounded bg-[var(--bg-secondary)] text-[var(--text-secondary)] border border-[var(--border)]"
          >
            <option value="">—</option>
            {environments.map((env) => (
              <option key={env.id} value={env.id}>
                {env.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Input */}
      <div>
        <label className="text-[10px] text-[var(--text-muted)] block mb-1">
          {UI_KO.testInput}
        </label>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={3}
          placeholder="Enter test input..."
          className="w-full text-[11px] px-3 py-2 rounded bg-[var(--bg-secondary)] text-[var(--text-secondary)] border border-[var(--border)] resize-none"
        />
      </div>

      <button
        onClick={handleRun}
        disabled={loading || !envA || !envB || !input.trim()}
        className="text-[11px] px-4 py-1.5 rounded font-medium disabled:opacity-30 transition-colors"
        style={{
          background: 'var(--accent)',
          color: 'var(--bg-primary)',
        }}
      >
        {loading ? 'Running...' : UI_KO.runTest}
      </button>

      {error && (
        <div className="text-xs p-2 rounded bg-red-500/10 text-red-400">{error}</div>
      )}

      {/* Comparison result */}
      {abComparison && (
        <div className="grid grid-cols-2 gap-3">
          <ABSideCard label="A" side={abComparison.env_a} />
          <ABSideCard label="B" side={abComparison.env_b} />

          {/* Diff summary */}
          <div className="col-span-2 bg-[var(--bg-secondary)] rounded-lg p-3">
            <h4
              className="text-[10px] font-semibold uppercase tracking-[0.15em] mb-2"
              style={{ color: 'var(--accent)' }}
            >
              {UI_KO.comparison}
            </h4>
            <div className="flex gap-4 text-[10px]">
              <DiffMetric
                label="Cost"
                diff={abComparison.diff.cost_diff}
                format={(v) => `$${Math.abs(v).toFixed(4)}`}
                betterWhen="negative"
              />
              <DiffMetric
                label="Duration"
                diff={abComparison.diff.duration_diff}
                format={(v) => `${(Math.abs(v) / 1000).toFixed(1)}s`}
                betterWhen="negative"
              />
              <DiffMetric
                label="Tokens"
                diff={abComparison.diff.token_diff}
                format={(v) => `${(Math.abs(v) / 1000).toFixed(1)}k`}
                betterWhen="negative"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ABSideCard: React.FC<{
  label: string;
  side: { model: string; status: string; result_text: string; cost_usd: number; duration_ms: number; total_tokens: number; iterations: number };
}> = ({ label, side }) => (
  <div className="bg-[var(--bg-secondary)] rounded-lg p-3">
    <div className="flex items-center gap-2 mb-2">
      <span
        className="text-[11px] font-bold px-1.5 py-0.5 rounded"
        style={{ background: 'var(--accent)', color: 'var(--bg-primary)' }}
      >
        {label}
      </span>
      <span className="text-[10px] font-mono text-[var(--text-muted)]">
        {side.model.replace('claude-', '').slice(0, 12)}
      </span>
    </div>
    <div className="grid grid-cols-2 gap-1 text-[9px] text-[var(--text-muted)]">
      <span>Cost: <span className="text-[var(--text-secondary)]">${side.cost_usd.toFixed(4)}</span></span>
      <span>Duration: <span className="text-[var(--text-secondary)]">{(side.duration_ms / 1000).toFixed(1)}s</span></span>
      <span>Tokens: <span className="text-[var(--text-secondary)]">{(side.total_tokens / 1000).toFixed(1)}k</span></span>
      <span>Iterations: <span className="text-[var(--text-secondary)]">{side.iterations}</span></span>
    </div>
    {side.result_text && (
      <p className="mt-2 text-[10px] text-[var(--text-secondary)] whitespace-pre-wrap break-words max-h-32 overflow-y-auto bg-[var(--bg-primary)] p-2 rounded">
        {side.result_text.slice(0, 500)}
      </p>
    )}
  </div>
);

const DiffMetric: React.FC<{
  label: string;
  diff: number;
  format: (v: number) => string;
  betterWhen: 'negative' | 'positive';
}> = ({ label, diff, format, betterWhen }) => {
  const isBetter = betterWhen === 'negative' ? diff < 0 : diff > 0;
  const arrow = diff === 0 ? '=' : diff > 0 ? 'A +' : 'B +';
  const color = diff === 0 ? 'text-[var(--text-muted)]' : isBetter ? 'text-emerald-400' : 'text-red-400';

  return (
    <span className={color}>
      {label}: {arrow}{format(diff)}
    </span>
  );
};

export default ABTestView;
