import { create } from "zustand";
import type { StageDescription, PresetInfo } from "../types/pipeline";
import type { EnvironmentSummary } from "../types/editor";
import type {
  EnvironmentManifest,
  StageManifestEntry,
} from "../types/environment";
import { fetchPipelineDescription, fetchPresets } from "../api/pipeline";
import {
  fetchEnvironments,
  fetchEnvironmentV2,
} from "../api/environment";
import { getStageMeta } from "../utils/stageMetadata";

/** Convert an EnvironmentManifest stage list into the StageDescription[]
 * that PipelineView renders. PipelineView only reads `order`, `name`, and
 * `is_active`; `strategies` is shown in the stage inspector pane so we
 * materialise whatever is in the manifest there. */
function manifestToStageDescriptions(
  stages: StageManifestEntry[]
): StageDescription[] {
  return stages.map((s) => ({
    name: s.name,
    order: s.order,
    category: getStageMeta(s.order)?.category ?? "",
    is_active: s.active,
    strategies: Object.entries(s.strategies).map(([slot, impl]) => ({
      slot_name: slot,
      current_impl: impl,
      available_impls: [impl],
      config: s.strategy_configs?.[slot] ?? {},
    })),
  }));
}

interface PipelineStore {
  stages: StageDescription[];
  activePreset: string;
  presets: PresetInfo[];

  // Environment-sourced pipeline (set when the user picks a saved env in
  // the Pipeline header dropdown). When non-null, sessions created from
  // this pipeline view are built via `env_id` — not a preset name.
  activeEnvId: string | null;
  environments: EnvironmentSummary[];

  loading: boolean;
  error: string | null;

  loadPipeline: (preset: string) => Promise<void>;
  loadPresets: () => Promise<void>;
  loadEnvironments: () => Promise<void>;
  loadPipelineFromEnv: (envId: string) => Promise<void>;
}

export const usePipelineStore = create<PipelineStore>((set) => ({
  stages: [],
  activePreset: "agent",
  presets: [],

  activeEnvId: null,
  environments: [],

  loading: false,
  error: null,

  loadPipeline: async (preset: string) => {
    // Switching to a preset clears any active env selection.
    set({ loading: true, error: null, activePreset: preset, activeEnvId: null });
    try {
      const data = await fetchPipelineDescription(preset);
      set({ stages: data.stages, loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },

  loadPresets: async () => {
    try {
      const presets = await fetchPresets();
      set({ presets });
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },

  loadEnvironments: async () => {
    try {
      const environments = await fetchEnvironments();
      set({ environments });
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },

  loadPipelineFromEnv: async (envId: string) => {
    set({ loading: true, error: null });
    try {
      const detail = await fetchEnvironmentV2(envId);
      const manifest: EnvironmentManifest | null = detail.manifest ?? null;
      if (!manifest) {
        throw new Error("Environment has no manifest");
      }
      set({
        stages: manifestToStageDescriptions(manifest.stages),
        activeEnvId: envId,
        activePreset: "",
        loading: false,
      });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },
}));
