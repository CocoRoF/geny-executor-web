/* StageList — the left-pane 16-row stage list with category coloring.
 *
 * Shows every stage in the manifest (sorted by order). Clicking a row
 * selects that stage in the builder store, which the right-pane
 * StageCard reacts to.
 */
import React from "react";

import { useEnvironmentBuilderStore } from "../../stores/environmentBuilderStore";
import type { StageIntrospection } from "../../types/catalog";
import type { StageManifestEntry } from "../../types/environment";

interface StageListProps {
  stages: StageManifestEntry[];
}

function getCategory(
  stage: StageManifestEntry,
  catalog: Record<number, StageIntrospection>
): string {
  return catalog[stage.order]?.category ?? "";
}

const StageList: React.FC<StageListProps> = ({ stages }) => {
  const {
    selectedStageOrder,
    selectStage,
    catalogByOrder,
  } = useEnvironmentBuilderStore();

  return (
    <ol className="space-y-1 p-2">
      {stages.map((stage) => {
        const active = selectedStageOrder === stage.order;
        const category = getCategory(stage, catalogByOrder);
        return (
          <li key={stage.order}>
            <button
              type="button"
              onClick={() => selectStage(stage.order)}
              className="w-full text-left px-2 py-2 rounded transition-colors"
              style={{
                background: active ? "var(--bg-tertiary)" : "transparent",
                borderLeft: active
                  ? "3px solid var(--accent)"
                  : "3px solid transparent",
                opacity: stage.active ? 1 : 0.55,
              }}
            >
              <div className="flex items-center gap-2">
                <span
                  className="text-[10px] font-mono w-6 text-right"
                  style={{ color: "var(--text-muted)" }}
                >
                  {stage.order.toString().padStart(2, "0")}
                </span>
                <div className="flex-1 min-w-0">
                  <div
                    className="text-xs font-semibold truncate"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {stage.name}
                  </div>
                  <div
                    className="text-[10px] truncate"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {stage.artifact}
                    {category ? ` · ${category}` : ""}
                  </div>
                </div>
                {!stage.active && (
                  <span
                    className="text-[9px] px-1.5 py-0.5 rounded"
                    style={{
                      background: "var(--bg-tertiary)",
                      color: "var(--text-muted)",
                    }}
                  >
                    off
                  </span>
                )}
              </div>
            </button>
          </li>
        );
      })}
    </ol>
  );
};

export default StageList;
