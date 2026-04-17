/** WaterfallChart — stage timing waterfall visualization. */
import React from 'react';
import type { WaterfallData } from '../../types/history';
import { UI_KO } from '../../locales/ko';

interface Props {
  data: WaterfallData;
}

const BAR_COLORS: Record<string, string> = {
  normal: 'bg-[var(--accent)]',
  cached: 'bg-blue-500/60',
  skipped: 'bg-gray-500/40',
};

const WaterfallChart: React.FC<Props> = ({ data }) => {
  const allStages = data.iterations.flatMap((it) => it.stages);
  const maxDuration = Math.max(1, ...allStages.map((s) => s.duration_ms));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h4
          className="text-[10px] font-semibold uppercase tracking-[0.15em]"
          style={{ color: 'var(--accent)' }}
        >
          {UI_KO.waterfall}
        </h4>
        <span className="text-[10px] text-[var(--text-muted)]">
          Total: {(data.total_duration_ms / 1000).toFixed(1)}s
        </span>
      </div>

      {data.iterations.map((iteration) => (
        <div key={iteration.iteration} className="space-y-1">
          <h5 className="text-[10px] font-medium text-[var(--text-muted)] mb-1">
            {UI_KO.iteration} {iteration.iteration + 1}
          </h5>

          {iteration.stages.map((stage) => {
            const pct = Math.max(1, (stage.duration_ms / maxDuration) * 100);
            const barClass = stage.was_skipped
              ? BAR_COLORS.skipped
              : stage.was_cached
                ? BAR_COLORS.cached
                : BAR_COLORS.normal;

            return (
              <div key={stage.order} className="flex items-center gap-2">
                <span className="w-28 text-[10px] text-[var(--text-secondary)] truncate text-right shrink-0">
                  {stage.name}
                </span>
                <div className="flex-1 h-5 bg-[var(--bg-tertiary)] rounded relative overflow-hidden">
                  <div
                    className={`h-full rounded transition-all ${barClass}`}
                    style={{ width: `${pct}%`, opacity: 0.8 }}
                  />
                  <span className="absolute right-1.5 top-0 text-[9px] leading-5 text-[var(--text-muted)] font-mono">
                    {stage.duration_ms}ms
                  </span>
                </div>
                <div className="flex gap-1 shrink-0">
                  {stage.was_cached && (
                    <span className="text-[8px] px-1 py-0.5 rounded bg-blue-500/10 text-blue-400">
                      {UI_KO.cached}
                    </span>
                  )}
                  {stage.was_skipped && (
                    <span className="text-[8px] px-1 py-0.5 rounded bg-gray-500/10 text-gray-400">
                      {UI_KO.skipped}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ))}

      {/* Legend */}
      <div className="flex gap-4 text-[9px] text-[var(--text-muted)] pt-2 border-t border-[var(--border)]">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded bg-[var(--accent)] opacity-80" /> Normal
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded bg-blue-500/60" /> Cached
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded bg-gray-500/40" /> Skipped
        </span>
      </div>
    </div>
  );
};

export default WaterfallChart;
