/** ToolCallTimeline — chronological tool call display. */
import React, { useState } from 'react';
import type { ToolCallRecord } from '../../types/history';
import { UI_KO } from '../../locales/ko';

interface Props {
  records: ToolCallRecord[];
}

const ToolCallTimeline: React.FC<Props> = ({ records }) => {
  const [expanded, setExpanded] = useState<number | null>(null);

  if (records.length === 0) {
    return (
      <p className="text-xs text-[var(--text-muted)] italic text-center py-4">
        No tool calls recorded
      </p>
    );
  }

  return (
    <div className="space-y-1">
      <h4
        className="text-[10px] font-semibold uppercase tracking-[0.15em] mb-2"
        style={{ color: 'var(--accent)' }}
      >
        {UI_KO.toolCalls} ({records.length})
      </h4>

      {records.map((tc, i) => (
        <div
          key={i}
          className="border border-[var(--border)] rounded-lg overflow-hidden"
        >
          <button
            onClick={() => setExpanded(expanded === i ? null : i)}
            className="w-full px-3 py-2 flex items-center justify-between text-left hover:bg-[var(--bg-tertiary)] transition-colors"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span
                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  tc.is_error ? 'bg-red-400' : 'bg-emerald-400'
                }`}
              />
              <span className="text-[11px] font-mono text-[var(--text-secondary)] truncate">
                {tc.tool_name}
              </span>
              <span className="text-[9px] text-[var(--text-muted)]">
                iter {tc.iteration}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-[var(--text-muted)]">
                {tc.duration_ms}ms
              </span>
              <span className="text-xs text-[var(--text-muted)]">
                {expanded === i ? '▲' : '▼'}
              </span>
            </div>
          </button>

          {expanded === i && (
            <div className="border-t border-[var(--border)] px-3 py-2 space-y-2 max-h-60 overflow-y-auto">
              {tc.input_json && (
                <div>
                  <span className="text-[9px] font-semibold uppercase text-[var(--text-muted)]">
                    Input
                  </span>
                  <pre className="text-[10px] font-mono text-[var(--text-secondary)] bg-[var(--bg-secondary)] p-2 rounded mt-0.5 overflow-x-auto">
                    {formatJson(tc.input_json)}
                  </pre>
                </div>
              )}
              {tc.output_text && (
                <div>
                  <span className="text-[9px] font-semibold uppercase text-[var(--text-muted)]">
                    Output
                  </span>
                  <pre className="text-[10px] font-mono text-[var(--text-secondary)] bg-[var(--bg-secondary)] p-2 rounded mt-0.5 overflow-x-auto whitespace-pre-wrap">
                    {tc.output_text.slice(0, 2000)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

function formatJson(raw: string): string {
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}

export default ToolCallTimeline;
