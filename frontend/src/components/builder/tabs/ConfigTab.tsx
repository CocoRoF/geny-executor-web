/* ConfigTab — edits a stage's config + per-strategy configs.
 *
 * Splits the schema-driven form into two sections:
 *   1. Stage-level config (derived from StageIntrospection.config_schema)
 *   2. One collapsible block per strategy slot, using the current impl's
 *      schema from SlotIntrospection.impl_schemas[currentImpl]
 *
 * The library emits JSON Schema; we flatten it via `flattenJsonSchema` before
 * handing it to the ConfigSchemaForm widget. Everything writes through
 * UpdateStageTemplatePayload, debounced in StageCard.
 */
import React from "react";

import ConfigSchemaForm from "../ConfigSchemaForm";
import type { StageIntrospection } from "../../../types/catalog";
import type { StageManifestEntry } from "../../../types/environment";
import { flattenJsonSchema } from "../../../utils/jsonSchema";

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
  const stageSchema = React.useMemo(
    () => flattenJsonSchema(introspection.config_schema),
    [introspection.config_schema]
  );
  const hasStageSchema = Object.keys(stageSchema).length > 0;

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
        const implSchema = flattenJsonSchema(
          slot.impl_schemas?.[currentImpl] ?? null
        );
        const slotConfig = stage.strategy_configs[slotName] ?? {};
        return (
          <section
            key={slotName}
            className="border border-[var(--border)] rounded p-3 bg-[var(--bg-tertiary)]/40"
          >
            <header className="flex items-center justify-between mb-2">
              <h5 className="text-xs font-semibold text-[var(--text-primary)]">
                {slotName}
                {slot.required && (
                  <span className="text-[var(--accent)] ml-1">*</span>
                )}
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
            {Object.keys(implSchema).length > 0 ? (
              <ConfigSchemaForm
                schema={implSchema}
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
