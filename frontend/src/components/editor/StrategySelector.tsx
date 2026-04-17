/* StrategySelector — select + configure a strategy implementation for a slot */
import React, { useState } from "react";
import type { StrategyDetailInfo } from "../../types/editor";
import ConfigForm from "./ConfigForm";

interface StrategySelectorProps {
  slot: StrategyDetailInfo;
  onSwap: (newImpl: string, config?: Record<string, unknown>) => void;
  disabled?: boolean;
}

const StrategySelector: React.FC<StrategySelectorProps> = ({
  slot,
  onSwap,
  disabled = false,
}) => {
  const [selected, setSelected] = useState(slot.current_impl);
  const [configValues, setConfigValues] = useState<Record<string, unknown>>(
    slot.config
  );
  const [showConfig, setShowConfig] = useState(false);
  const changed = selected !== slot.current_impl;

  return (
    <div className="border border-[var(--border-primary)] rounded-lg p-3 mb-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-[var(--text-primary)]">
          {slot.slot_name}
        </span>
        {changed && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400">
            Changed
          </span>
        )}
      </div>

      {/* Radio options */}
      <div className="space-y-1.5">
        {slot.available_impls.map((impl) => (
          <label
            key={impl}
            className={`flex items-center gap-2 cursor-pointer rounded px-2 py-1.5 transition-colors ${
              selected === impl
                ? "bg-[var(--accent)]/10 border border-[var(--accent)]/30"
                : "hover:bg-[var(--bg-tertiary)]"
            }`}
          >
            <input
              type="radio"
              name={`strategy-${slot.slot_name}`}
              value={impl}
              checked={selected === impl}
              onChange={() => setSelected(impl)}
              className="accent-[var(--accent)]"
              disabled={disabled}
            />
            <div className="flex-1 min-w-0">
              <span className="text-sm text-[var(--text-primary)]">
                {impl}
              </span>
              {slot.impl_descriptions[impl] && (
                <p className="text-xs text-[var(--text-muted)] truncate">
                  {slot.impl_descriptions[impl]}
                </p>
              )}
            </div>
          </label>
        ))}
      </div>

      {/* Config expander */}
      {Object.keys(slot.config_schema).length > 0 && (
        <div className="mt-2">
          <button
            className="text-xs text-[var(--accent)] hover:underline flex items-center gap-1"
            onClick={() => setShowConfig(!showConfig)}
          >
            <span
              className={`transition-transform ${showConfig ? "rotate-90" : ""}`}
            >
              ▶
            </span>
            Configuration
          </button>
          {showConfig && (
            <div className="mt-2 pl-2 border-l border-[var(--border-primary)]">
              <ConfigForm
                schema={slot.config_schema}
                values={configValues}
                onChange={setConfigValues}
                readOnly={disabled}
              />
            </div>
          )}
        </div>
      )}

      {/* Apply button */}
      {changed && !disabled && (
        <button
          className="mt-2 w-full text-sm py-1.5 rounded bg-[var(--accent)] text-black font-medium hover:opacity-90 transition-opacity"
          onClick={() => onSwap(selected, configValues)}
        >
          Apply {selected}
        </button>
      )}
    </div>
  );
};

export default StrategySelector;
