/* StageCard — right-hand editor panel for the currently-selected stage.
 *
 * Owns:
 *   - artifact picker (top of the card)
 *   - 4-tab switcher: Config / Tools / Model / Chain
 *   - local dirty-buffer for each tab so typing feels instant; the parent
 *     patchStage call is debounced via a 600 ms trailing timer.
 */
import React from "react";

import { useEnvironmentBuilderStore } from "../../stores/environmentBuilderStore";
import type { ArtifactInfo, StageIntrospection } from "../../types/catalog";
import type {
  StageManifestEntry,
  StageModelOverride,
  StageToolBinding,
  UpdateStageTemplatePayload,
} from "../../types/environment";
import ChainTab from "./tabs/ChainTab";
import ConfigTab from "./tabs/ConfigTab";
import ModelTab from "./tabs/ModelTab";
import ToolsTab from "./tabs/ToolsTab";

type TabKey = "config" | "tools" | "model" | "chain";

interface StageCardProps {
  stage: StageManifestEntry;
}

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: "config", label: "Config" },
  { key: "tools", label: "Tools" },
  { key: "model", label: "Model" },
  { key: "chain", label: "Chain" },
];

const PATCH_DEBOUNCE_MS = 600;

const StageCard: React.FC<StageCardProps> = ({ stage }) => {
  const [tab, setTab] = React.useState<TabKey>("config");
  const [artifacts, setArtifacts] = React.useState<ArtifactInfo[]>([]);
  const [introspection, setIntrospection] =
    React.useState<StageIntrospection | null>(null);

  const {
    loadArtifactsForStage,
    loadArtifactIntrospection,
    patchStage,
    saving,
  } = useEnvironmentBuilderStore();

  // Fetch the artifact list (for the picker) + the current artifact's
  // introspection (for the tabs) whenever the stage or artifact changes.
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

  // Debounced patch: buffer outgoing changes, flush after a quiet window.
  const pendingRef = React.useRef<UpdateStageTemplatePayload>({});
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const queuePatch = React.useCallback(
    (partial: UpdateStageTemplatePayload) => {
      pendingRef.current = { ...pendingRef.current, ...partial };
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        const payload = pendingRef.current;
        pendingRef.current = {};
        if (Object.keys(payload).length === 0) return;
        void patchStage(stage.order, payload);
      }, PATCH_DEBOUNCE_MS);
    },
    [patchStage, stage.order]
  );

  // Flush on unmount / stage switch so we don't swallow edits.
  React.useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        const payload = pendingRef.current;
        pendingRef.current = {};
        if (Object.keys(payload).length > 0) {
          void patchStage(stage.order, payload);
        }
      }
    };
  }, [stage.order, patchStage]);

  const handleArtifactChange = (name: string) => {
    if (name === stage.artifact) return;
    queuePatch({ artifact: name });
  };

  const handleActiveToggle = () => {
    queuePatch({ active: !stage.active });
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
            onChangeConfig={(next) => queuePatch({ config: next })}
            onChangeStrategyImpl={(slot, impl) =>
              queuePatch({
                strategies: { ...stage.strategies, [slot]: impl },
              })
            }
            onChangeStrategyConfig={(slot, next) =>
              queuePatch({
                strategy_configs: { ...stage.strategy_configs, [slot]: next },
              })
            }
          />
        );
      case "tools":
        return (
          <ToolsTab
            stage={stage}
            supported={introspection.supports_tool_binding}
            onChange={(next: StageToolBinding | null) =>
              queuePatch({ tool_binding: next })
            }
          />
        );
      case "model":
        return (
          <ModelTab
            stage={stage}
            supported={introspection.supports_model_override}
            onChange={(next: StageModelOverride | null) =>
              queuePatch({ model_override: next })
            }
          />
        );
      case "chain":
        return (
          <ChainTab
            stage={stage}
            chains={introspection.chains}
            onChange={(next) => queuePatch({ chain_order: next })}
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
          <div className="flex items-center gap-2">
            {saving && (
              <span className="text-[10px] text-[var(--text-muted)] italic">
                Saving…
              </span>
            )}
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
        </div>

        {artifacts.length > 0 && (
          <div className="flex items-center gap-2">
            <label className="text-[11px] text-[var(--text-secondary)]">
              Artifact
            </label>
            <select
              value={stage.artifact}
              onChange={(e) => handleArtifactChange(e.target.value)}
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

      {/* Tab switcher */}
      <nav className="flex shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>
        {TABS.map((t) => {
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
