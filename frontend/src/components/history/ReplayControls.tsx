/** ReplayControls — execution replay controls with speed and breakpoints. */
import React, { useState } from 'react';
import { UI_KO } from '../../locales/ko';

export interface ReplayState {
  playing: boolean;
  speed: number;
  currentIndex: number;
  totalEvents: number;
  currentStage: string | null;
}

interface Props {
  state: ReplayState;
  breakpoints: number[];
  onPlay: () => void;
  onPause: () => void;
  onSpeedChange: (speed: number) => void;
  onSeek: (index: number) => void;
  onToggleBreakpoint: (stageOrder: number) => void;
}

const SPEEDS = [0.25, 0.5, 1, 2, 4];

const ReplayControls: React.FC<Props> = ({
  state,
  breakpoints,
  onPlay,
  onPause,
  onSpeedChange,
  onSeek,
}) => {
  const progress = state.totalEvents > 0 ? (state.currentIndex / state.totalEvents) * 100 : 0;

  return (
    <div className="bg-[var(--bg-secondary)] rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between">
        <h4
          className="text-[10px] font-semibold uppercase tracking-[0.15em]"
          style={{ color: 'var(--accent)' }}
        >
          {UI_KO.replay}
        </h4>
        {state.currentStage && (
          <span className="text-[10px] font-mono text-[var(--text-secondary)]">
            {state.currentStage}
          </span>
        )}
      </div>

      {/* Progress bar */}
      <div
        className="h-2 bg-[var(--bg-tertiary)] rounded cursor-pointer relative"
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const pct = (e.clientX - rect.left) / rect.width;
          onSeek(Math.round(pct * state.totalEvents));
        }}
      >
        <div
          className="h-full bg-[var(--accent)] rounded transition-all"
          style={{ width: `${progress}%`, opacity: 0.7 }}
        />
        {/* Breakpoint markers */}
        {breakpoints.map((bp) => (
          <div
            key={bp}
            className="absolute top-0 w-1 h-full bg-red-500"
            style={{ left: `${(bp / state.totalEvents) * 100}%` }}
          />
        ))}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={state.playing ? onPause : onPlay}
            className="text-[11px] px-3 py-1 rounded transition-colors font-medium"
            style={{
              background: state.playing ? 'var(--bg-tertiary)' : 'var(--accent)',
              color: state.playing ? 'var(--text-secondary)' : 'var(--bg-primary)',
            }}
          >
            {state.playing ? '⏸ Pause' : '▶ Play'}
          </button>

          <span className="text-[9px] text-[var(--text-muted)]">
            {state.currentIndex} / {state.totalEvents}
          </span>
        </div>

        {/* Speed selector */}
        <div className="flex items-center gap-1">
          <span className="text-[9px] text-[var(--text-muted)]">Speed:</span>
          {SPEEDS.map((s) => (
            <button
              key={s}
              onClick={() => onSpeedChange(s)}
              className={`text-[9px] px-1.5 py-0.5 rounded ${
                state.speed === s
                  ? 'bg-[var(--accent)]/10 text-[var(--accent)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              }`}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ReplayControls;
