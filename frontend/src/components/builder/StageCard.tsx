/* StageCard — right-hand editor panel for the currently-selected stage.
 *
 * Owns:
 *   - artifact picker (top of the card)
 *   - tab switcher rendering only the tabs the current (stage, artifact)
 *     actually supports (see `visibleTabsFor` below).
 *   - edit dispatch: every widget calls `updateStageDraft(order, partial)`
 *     which mutates the in-memory draft. No debouncing, no per-field
 *     network — the parent view saves the whole manifest on Save.
 */
import React from "react";

import { useEnvironmentBuilderStore } from "../../stores/environmentBuilderStore";
import type { ArtifactInfo, StageIntrospection } from "../../types/catalog";
import type {
  StageManifestEntry,
  StageModelOverride,
  StageToolBinding,
} from "../../types/environment";
import ChainTab from "./tabs/ChainTab";
import ConfigTab from "./tabs/ConfigTab";
import ModelTab from "./tabs/ModelTab";
import ToolsTab from "./tabs/ToolsTab";

type TabKey = "config" | "tools" | "model" | "chain";

interface StageCardProps {
  stage: StageManifestEntry;
}

const ALL_TABS: Array<{ key: TabKey; label: string }> = [
  { key: "config", label: "Config" },
  { key: "tools", label: "Tools" },
  { key: "model", label: "Model" },
  { key: "chain", label: "Chain" },
];

/** Which tabs the current (stage, artifact) actually supports.
 *
 * Driven by the library's honest capability flags (geny-executor >=0.13.2):
 *   - Config: always available — every stage exposes something configurable.
 *   - Tools:  only if the runtime consumes `tool_binding` (s10_tool today).
 *   - Model:  only if the runtime consumes `model_override` (s06_api today).
 *   - Chain:  only if the stage exposes at least one strategy chain
 *             (s04_guard, s14_emit today).
 *
 * Before the introspection arrives we render Config only — no misleading
 * placeholders for tabs we aren't yet sure exist on this artifact.
 */
function visibleTabsFor(
  insp: StageIntrospection | null
): Array<{ key: TabKey; label: string }> {
  if (!insp) return ALL_TABS.filter((t) => t.key === "config");
  const hasChains = Object.keys(insp.strategy_chains ?? {}).length > 0;
  return ALL_TABS.filter((t) => {
    if (t.key === "config") return true;
    if (t.key === "tools") return insp.tool_binding_supported;
    if (t.key === "model") return insp.model_override_supported;
    if (t.key === "chain") return hasChains;
    return false;
  });
}

/** Build the default strategy map for a freshly-selected artifact.
 *
 * Every slot that has a registered `current_impl` contributes one entry —
 * this matches what the library writes into a manifest's `strategies` dict
 * after `blank_manifest`, so instantiation won't complain about missing
 * slots when the user toggles the stage active.
 */
function defaultStrategiesFor(insp: StageIntrospection): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [slotName, slot] of Object.entries(insp.strategy_slots)) {
    if (slot.current_impl) out[slotName] = slot.current_impl;
  }
  return out;
}

const StageCard: React.FC<StageCardProps> = ({ stage }) => {
  const [tab, setTab] = React.useState<TabKey>("config");
  const [artifacts, setArtifacts] = React.useState<ArtifactInfo[]>([]);
  const [introspection, setIntrospection] =
    React.useState<StageIntrospection | null>(null);

  const {
    loadArtifactsForStage,
    loadArtifactIntrospection,
    updateStageDraft,
  } = useEnvironmentBuilderStore();

  // Fetch the artifact list (for the picker) + the current artifact's
  // introspection (for the tabs) whenever the stage or artifact changes.
  // These are read-only catalog fetches, cached in the store.
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const list = await loadArtifactsForStage(stage.order);
      if (!cancelled) setArtifacts(list);
      const insp = await loadArtifactIntrospection(stage.order, stage.artifact);
      if (!cancelled) setIntrospection(insp);
    })();
    return () => {
      cancelled = true;
    };
  }, [stage.order, stage.artifact, loadArtifactsForStage, loadArtifactIntrospection]);

  const visibleTabs = React.useMemo(
    () => visibleTabsFor(introspection),
    [introspection]
  );

  // If the currently-selected tab disappears (e.g. artifact change hides
  // Model / Tools / Chain), snap back to the first visible tab so the body
  // isn't rendered against a hidden key.
  React.useEffect(() => {
    if (!visibleTabs.some((t) => t.key === tab)) {
      setTab(visibleTabs[0]?.key ?? "config");
    }
  }, [visibleTabs, tab]);

  // Artifact change must cascade-reset dependent fields or the manifest will
  // carry slot names / config keys from the old artifact that don't exist on
  // the new one — a latent instantiation-time crash. We load the target
  // artifact's introspection first so defaults come from the library itself.
  const handleArtifactChange = async (name: string) => {
    if (name === stage.artifact) return;
    const targetInsp = await loadArtifactIntrospection(stage.order, name);
    updateStageDraft(stage.order, {
      artifact: name,
      strategies: defaultStrategiesFor(targetInsp),
      strategy_configs: {},
      config: { ...targetInsp.config },
      chain_order: {},
    });
  };

  const handleActiveToggle = () => {
    updateStageDraft(stage.order, { active: !stage.active });
  };

  const renderTab = () => {
    if (!introspection) {
      return (
        <div className="p-4 text-xs italic text-[var(--text-muted)]">
          Loading stage details…
        </div>
      );
    }
    switch (tab) {
      case "config":
        return (
          <ConfigTab
            stage={stage}
            introspection={introspection}
            onChangeConfig={(next) =>
              updateStageDraft(stage.order, { config: next })
            }
            onChangeStrategyImpl={(slot, impl) =>
              updateStageDraft(stage.order, {
                strategies: { ...stage.strategies, [slot]: impl },
                // Picking a different impl invalidates the previous impl's
                // config for that slot — blank the per-slot config so the
                // user starts from the new impl's defaults.
                strategy_configs: { ...stage.strategy_configs, [slot]: {} },
              })
            }
            onChangeStrategyConfig={(slot, next) =>
              updateStageDraft(stage.order, {
                strategy_configs: { ...stage.strategy_configs, [slot]: next },
              })
            }
          />
        );
      case "tools":
        return (
          <ToolsTab
            stage={stage}
            supported={introspection.tool_binding_supported}
            onChange={(next: StageToolBinding | null) =>
              updateStageDraft(stage.order, { tool_binding: next })
            }
          />
        );
      case "model":
        return (
          <ModelTab
            stage={stage}
            supported={introspection.model_override_supported}
            onChange={(next: StageModelOverride | null) =>
              updateStageDraft(stage.order, { model_override: next })
            }
          />
        );
      case "chain":
        return (
          <ChainTab
            stage={stage}
            chains={introspection.strategy_chains}
            onChange={(next) =>
              updateStageDraft(stage.order, { chain_order: next })
            }
          />
        );
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header — stage name + active toggle + artifact picker */}
      <header
        className="px-4 py-3 shrink-0"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <div className="flex items-center justify-between mb-2">
          <div>
            <span
              className="text-[10px] font-semibold uppercase tracking-[0.2em]"
              style={{ color: "var(--accent)" }}
            >
              Stage {stage.order}
            </span>
            <h3
              className="text-base font-bold leading-tight"
              style={{
                fontFamily: "'Playfair Display', serif",
                color: "var(--text-primary)",
              }}
            >
              {stage.name}
            </h3>
          </div>
          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <input
              type="checkbox"
              className="w-3.5 h-3.5 accent-[var(--accent)]"
              checked={stage.active}
              onChange={handleActiveToggle}
            />
            <span className="text-[11px] text-[var(--text-secondary)]">
              Active
            </span>
          </label>
        </div>

        {artifacts.length > 0 && (
          <div className="flex items-center gap-2">
            <label className="text-[11px] text-[var(--text-secondary)]">
              Artifact
            </label>
            <select
              value={stage.artifact}
              onChange={(e) => {
                void handleArtifactChange(e.target.value);
              }}
              className="flex-1 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded px-2 py-1 text-xs text-[var(--text-primary)]"
            >
              {artifacts.map((a) => (
                <option key={a.name} value={a.name}>
                  {a.name}
                  {a.description ? ` — ${a.description}` : ""}
                </option>
              ))}
            </select>
          </div>
        )}
      </header>

      {/* Tab switcher — only tabs the current (stage, artifact) actually supports */}
      <nav className="flex shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>
        {visibleTabs.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className="flex-1 text-xs py-2 transition-colors"
              style={{
                color: active ? "var(--accent)" : "var(--text-muted)",
                borderBottom: active
                  ? "2px solid var(--accent)"
                  : "2px solid transparent",
                background: active ? "var(--bg-tertiary)" : "transparent",
              }}
            >
              {t.label}
            </button>
          );
        })}
      </nav>

      {/* Tab body */}
      <div className="flex-1 overflow-y-auto">{renderTab()}</div>
    </div>
  );
};

export default StageCard;
