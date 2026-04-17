/** ExecutionDetail — shows full execution info with timings and tool calls. */
import React, { useEffect, useState } from 'react';
import { useHistoryStore } from '../../stores/historyStore';
import { UI_KO } from '../../locales/ko';
import WaterfallChart from './WaterfallChart';
import ToolCallTimeline from './ToolCallTimeline';

const ExecutionDetail: React.FC = () => {
  const { detail, waterfall, loadWaterfall, loading } = useHistoryStore();
  const [tab, setTab] = useState<'overview' | 'waterfall' | 'tools'>('overview');

  useEffect(() => {
    if (detail && tab === 'waterfall' && !waterfall) {
      loadWaterfall(detail.id);
    }
  }, [detail, tab, waterfall, loadWaterfall]);

  if (!detail) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-xs text-[var(--text-muted)] italic">
          {UI_KO.viewDetail}
        </p>
      </div>
    );
  }

  const STATUS_BADGE: Record<string, string> = {
    completed: 'bg-emerald-500/10 text-emerald-400',
    error: 'bg-red-500/10 text-red-400',
    running: 'bg-blue-500/10 text-blue-400',
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-mono text-[var(--text-muted)]">#{detail.id.slice(0, 8)}</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${STATUS_BADGE[detail.status] || ''}`}>
            {detail.status}
          </span>
          {detail.model && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-tertiary)] font-mono text-[var(--text-muted)]">
              {detail.model.replace('claude-', '').slice(0, 15)}
            </span>
          )}
        </div>

        {/* Stats row */}
        <div className="flex flex-wrap gap-3 text-[10px] text-[var(--text-muted)]">
          {detail.duration_ms > 0 && <span>⏱ {(detail.duration_ms / 1000).toFixed(1)}s</span>}
          {detail.total_cost_usd > 0 && <span>💰 ${detail.total_cost_usd.toFixed(4)}</span>}
          {detail.iterations > 0 && <span>🔄 {detail.iterations} iter</span>}
          {detail.total_tokens > 0 && <span>📊 {(detail.total_tokens / 1000).toFixed(1)}k tokens</span>}
          {detail.tool_call_count > 0 && <span>🔧 {detail.tool_call_count} tools</span>}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex px-4 pt-2 gap-1 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
        {(['overview', 'waterfall', 'tools'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`text-[11px] px-3 py-1.5 rounded-t transition-colors ${
              tab === t
                ? 'bg-[var(--bg-secondary)] text-[var(--accent)] font-medium'
                : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
            }`}
          >
            {t === 'overview' ? UI_KO.overview : t === 'waterfall' ? UI_KO.waterfall : UI_KO.toolCalls}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {tab === 'overview' && <OverviewTab detail={detail} />}
        {tab === 'waterfall' && (
          waterfall ? <WaterfallChart data={waterfall} /> : (
            <p className="text-xs text-[var(--text-muted)] animate-pulse">Loading waterfall...</p>
          )
        )}
        {tab === 'tools' && <ToolCallTimeline records={detail.tool_call_records} />}
      </div>
    </div>
  );
};

/** Overview sub-tab */
const OverviewTab: React.FC<{ detail: NonNullable<ReturnType<typeof useHistoryStore.getState>['detail']> }> = ({ detail }) => (
  <div className="space-y-4">
    {/* Input */}
    <Section title="Input">
      <p className="text-[11px] text-[var(--text-secondary)] whitespace-pre-wrap break-words">
        {detail.input_text}
      </p>
    </Section>

    {/* Result */}
    {detail.result_text && (
      <Section title="Result">
        <p className="text-[11px] text-[var(--text-secondary)] whitespace-pre-wrap break-words max-h-60 overflow-y-auto">
          {detail.result_text}
        </p>
      </Section>
    )}

    {/* Error */}
    {detail.error_message && (
      <Section title="Error">
        <div className="text-[11px] text-red-400 bg-red-500/10 p-2 rounded font-mono">
          <div className="font-medium">{detail.error_type}</div>
          <div>{detail.error_message}</div>
          {detail.error_stage != null && <div>Stage: {detail.error_stage}</div>}
        </div>
      </Section>
    )}

    {/* Token Breakdown */}
    <Section title="Tokens">
      <div className="grid grid-cols-3 gap-2 text-[10px]">
        <MetricBox label="Input" value={detail.input_tokens} />
        <MetricBox label="Output" value={detail.output_tokens} />
        <MetricBox label="Cache Read" value={detail.cache_read_tokens} />
        <MetricBox label="Cache Write" value={detail.cache_write_tokens} />
        <MetricBox label="Thinking" value={detail.thinking_tokens} />
        <MetricBox label="Total" value={detail.total_tokens} accent />
      </div>
    </Section>

    {/* Stage Timings Summary */}
    {detail.stage_timings.length > 0 && (
      <Section title={UI_KO.stageTimings}>
        <div className="space-y-1">
          {detail.stage_timings.map((st, i) => (
            <div
              key={i}
              className="flex items-center justify-between text-[10px] px-2 py-1 rounded bg-[var(--bg-secondary)]"
            >
              <span className="text-[var(--text-secondary)]">
                {st.stage_name}
                {st.was_cached && <span className="ml-1 text-blue-400">[cached]</span>}
                {st.was_skipped && <span className="ml-1 text-gray-400">[skipped]</span>}
              </span>
              <span className="text-[var(--text-muted)] font-mono">{st.duration_ms}ms</span>
            </div>
          ))}
        </div>
      </Section>
    )}
  </div>
);

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div>
    <h4 className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--accent)] mb-1.5">
      {title}
    </h4>
    {children}
  </div>
);

const MetricBox: React.FC<{ label: string; value: number; accent?: boolean }> = ({
  label,
  value,
  accent,
}) => (
  <div className="px-2 py-1.5 rounded bg-[var(--bg-secondary)] text-center">
    <div className={`text-[11px] font-mono ${accent ? 'text-[var(--accent)]' : 'text-[var(--text-secondary)]'}`}>
      {value.toLocaleString()}
    </div>
    <div className="text-[9px] text-[var(--text-muted)]">{label}</div>
  </div>
);

export default ExecutionDetail;
