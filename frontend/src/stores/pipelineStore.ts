import { create } from "zustand";
import type { StageDescription, PresetInfo } from "../types/pipeline";
import { fetchPipelineDescription, fetchPresets } from "../api/pipeline";
import { useUIStore } from "./uiStore";

interface PipelineStore {
  stages: StageDescription[];
  activePreset: string;
  presets: PresetInfo[];
  loading: boolean;
  error: string | null;
  loadPipeline: (preset: string) => Promise<void>;
  loadPresets: () => Promise<void>;
}

export const usePipelineStore = create<PipelineStore>((set) => ({
  stages: [],
  activePreset: "agent",
  presets: [],
  loading: false,
  error: null,

  loadPipeline: async (preset: string) => {
    const engine = useUIStore.getState().engine;
    set({ loading: true, error: null, activePreset: preset });
    try {
      const data = await fetchPipelineDescription(preset, engine);
      set({ stages: data.stages, loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },

  loadPresets: async () => {
    const engine = useUIStore.getState().engine;
    try {
      const presets = await fetchPresets(engine);
      set({ presets });
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },
}));
