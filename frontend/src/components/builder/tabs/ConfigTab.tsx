/* ConfigTab — edits a stage's config + per-strategy configs.
 *
 * Splits the schema-driven form into two sections:
 *   1. Stage-level config (ConfigSchema from StageIntrospection.config_schema)
 *   2. One collapsible block per strategy slot, each with its own schema
 *
 * Everything writes through UpdateStageTemplatePayload so a single PATCH
 * lands with all the changed keys. Patching is debounced in the parent
 * (StageCard) so typing feels snappy.
 */
import React from "react";

import ConfigSchemaForm from "../ConfigSchemaForm";
import type { StageIntrospection } from "../../../types/catalog";
import type { StageManifestEntry } from "../../../types/environment";

interface ConfigTabProps {
  stage: StageManifestEntry;
  introspection: StageIntrospection;
  onChangeConfig: (next: Record<string, unknown>) => void;
  onChangeStrategyImpl: (slot: string, impl: string) => void;
  onChangeStrategyConfig: (
    slot: string,
    next: Record<string, unknown>
  ) => void;
}

const ConfigTab: React.FC<ConfigTabProps> = ({
  stage,
  introspection,
  onChangeConfig,
  onChangeStrategyImpl,
  onChangeStrategyConfig,
}) => {
  const stageSchema = introspection.config_schema;
  const hasStageSchema = Object.keys(stageSchema ?? {}).length > 0;

  return (
    <div className="space-y-6 p-4">
      {/* Stage-level config */}
      <section>
        <h4 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-2">
          Stage Config
        </h4>
        {hasStageSchema ? (
          <ConfigSchemaForm
            schema={stageSchema}
            values={stage.config}
            onChange={onChangeConfig}
          />
        ) : (
          <p className="text-xs italic text-[var(--text-muted)]">
            This stage has no configurable fields.
          </p>
        )}
      </section>

      {/* Strategy slots */}
      {Object.entries(introspection.strategy_slots).map(([slotName, slot]) => {
        const currentImpl =
          stage.strategies[slotName] ?? slot.current_impl ?? "";
        const slotConfig =
          stage.strategy_configs[slotName] ?? slot.config ?? {};
        return (
          <section
            key={slotName}
            className="border border-[var(--border)] rounded p-3 bg-[var(--bg-tertiary)]/40"
          >
            <header className="flex items-center justify-between mb-2">
              <h5 className="text-xs font-semibold text-[var(--text-primary)]">
                {slotName}
              </h5>
              <select
                className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded px-2 py-1 text-xs text-[var(--text-primary)]"
                value={currentImpl}
                onChange={(e) => onChangeStrategyImpl(slotName, e.target.value)}
              >
                {slot.available_impls.map((impl) => (
                  <option key={impl} value={impl}>
                    {impl}
                  </option>
                ))}
              </select>
            </header>
            {slot.impl_descriptions[currentImpl] && (
              <p className="text-[11px] text-[var(--text-muted)] mb-2 italic">
                {slot.impl_descriptions[currentImpl]}
              </p>
            )}
            {Object.keys(slot.config_schema ?? {}).length > 0 ? (
              <ConfigSchemaForm
                schema={slot.config_schema}
                values={slotConfig}
                onChange={(next) => onChangeStrategyConfig(slotName, next)}
              />
            ) : (
              <p className="text-[11px] italic text-[var(--text-muted)]">
                No fields for this implementation.
              </p>
            )}
          </section>
        );
      })}
    </div>
  );
};

export default ConfigTab;
