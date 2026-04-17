/** CostDashboard — cost analytics with summary and trend chart. */
import React, { useEffect, useState } from 'react';
import { useHistoryStore } from '../../stores/historyStore';
import { UI_KO } from '../../locales/ko';

interface Props {
  sessionId?: string;
}

const CostDashboard: React.FC<Props> = ({ sessionId }) => {
  const {
    costSummary,
    costTrend,
    stats,
    loadCostSummary,
    loadCostTrend,
    loadStats,
  } = useHistoryStore();
  const [granularity, setGranularity] = useState<'hour' | 'day' | 'week'>('hour');

  useEffect(() => {
    loadStats(sessionId);
    loadCostSummary(sessionId);
    loadCostTrend(sessionId, granularity);
  }, [sessionId, granularity, loadStats, loadCostSummary, loadCostTrend]);

  return (
    <div className="space-y-4 p-4">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label={UI_KO.totalCost} value={`$${(stats?.total_cost ?? 0).toFixed(4)}`} />
        <StatCard label="Executions" value={String(stats?.total ?? 0)} />
        <StatCard
          label={UI_KO.avgCost}
          value={`$${stats && stats.total > 0 ? (stats.total_cost / stats.total).toFixed(4) : '0'}`}
        />
        <StatCard
          label="Avg Duration"
          value={`${((stats?.avg_duration_ms ?? 0) / 1000).toFixed(1)}s`}
        />
      </div>

      {/* Model breakdown */}
      {costSummary && costSummary.by_model.length > 0 && (
        <div>
          <h4
            className="text-[10px] font-semibold uppercase tracking-[0.15em] mb-2"
            style={{ color: 'var(--accent)' }}
          >
            {UI_KO.costByModel}
          </h4>
          <div className="space-y-1.5">
            {costSummary.by_model.map((m) => {
              const pct =
                costSummary.total_cost > 0
                  ? (m.total_cost / costSummary.total_cost) * 100
                  : 0;
              return (
                <div key={m.model} className="bg-[var(--bg-secondary)] rounded p-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-mono text-[var(--text-secondary)]">
                      {m.model.replace('claude-', '')}
                    </span>
                    <span className="text-[10px] text-[var(--accent)] font-mono">
                      ${m.total_cost.toFixed(4)}
                    </span>
                  </div>
                  <div className="h-1.5 bg-[var(--bg-tertiary)] rounded overflow-hidden">
                    <div
                      className="h-full bg-[var(--accent)] rounded opacity-60"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="flex gap-3 mt-1 text-[9px] text-[var(--text-muted)]">
                    <span>{m.executions} runs</span>
                    <span>{(m.total_tokens / 1000).toFixed(1)}k tokens</span>
                    <span>avg ${m.avg_cost.toFixed(4)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Cost trend */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4
            className="text-[10px] font-semibold uppercase tracking-[0.15em]"
            style={{ color: 'var(--accent)' }}
          >
            {UI_KO.costTrend}
          </h4>
          <div className="flex gap-1">
            {(['hour', 'day', 'week'] as const).map((g) => (
              <button
                key={g}
                onClick={() => setGranularity(g)}
                className={`text-[9px] px-2 py-0.5 rounded ${
                  granularity === g
                    ? 'bg-[var(--accent)]/10 text-[var(--accent)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                }`}
              >
                {g === 'hour' ? UI_KO.hourly : g === 'day' ? UI_KO.daily : UI_KO.weekly}
              </button>
            ))}
          </div>
        </div>

        {costTrend.length > 0 ? (
          <SimpleTrendChart data={costTrend} />
        ) : (
          <p className="text-[10px] text-[var(--text-muted)] italic text-center py-4">
            No trend data
          </p>
        )}
      </div>
    </div>
  );
};

/** Stat card */
const StatCard: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="bg-[var(--bg-secondary)] rounded-lg p-3 text-center">
    <div className="text-sm font-mono text-[var(--accent)]">{value}</div>
    <div className="text-[9px] text-[var(--text-muted)] mt-0.5">{label}</div>
  </div>
);

/** Simple SVG bar chart for trend data (no external deps). */
const SimpleTrendChart: React.FC<{ data: { period: string; cost: number; executions: number }[] }> = ({
  data,
}) => {
  const maxCost = Math.max(0.0001, ...data.map((d) => d.cost));
  const barW = Math.max(4, Math.min(20, 400 / data.length));
  const chartW = data.length * (barW + 2);

  return (
    <div className="overflow-x-auto">
      <svg width={Math.max(chartW, 200)} height={80} className="block">
        {data.map((d, i) => {
          const h = (d.cost / maxCost) * 60;
          return (
            <g key={i}>
              <rect
                x={i * (barW + 2)}
                y={70 - h}
                width={barW}
                height={h}
                rx={1}
                fill="var(--accent)"
                opacity={0.5}
              />
              <title>
                {d.period}: ${d.cost.toFixed(4)} ({d.executions} runs)
              </title>
            </g>
          );
        })}
      </svg>
      <div className="flex justify-between text-[8px] text-[var(--text-muted)] mt-0.5">
        <span>{data[0]?.period.slice(-8)}</span>
        <span>{data[data.length - 1]?.period.slice(-8)}</span>
      </div>
    </div>
  );
};

export default CostDashboard;
