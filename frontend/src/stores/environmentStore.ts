/* environmentStore — Zustand store for environment management */
import { create } from "zustand";
import type {
  EnvironmentSummary,
  EnvironmentDetail,
  EnvironmentDiffResult,
} from "../types/editor";
import type { PresetInfo } from "../types/pipeline";
import {
  fetchEnvironments,
  saveEnvironment,
  fetchEnvironment,
  updateEnvironment,
  deleteEnvironment,
  exportEnvironment,
  importEnvironment,
  diffEnvironments,
  markAsPreset,
  unmarkPreset,
  getShareLink,
} from "../api/environment";
import { fetchPresets } from "../api/pipeline";

interface EnvironmentStore {
  // State
  environments: EnvironmentSummary[];
  presets: PresetInfo[];
  loading: boolean;
  error: string | null;
  selectedEnvId: string | null;
  selectedDetail: EnvironmentDetail | null;
  diffResult: EnvironmentDiffResult | null;

  // CRUD
  loadEnvironments: () => Promise<void>;
  save: (sessionId: string, name: string, description?: string, tags?: string[]) => Promise<string>;
  loadDetail: (envId: string) => Promise<void>;
  update: (envId: string, changes: { name?: string; description?: string; tags?: string[] }) => Promise<void>;
  remove: (envId: string) => Promise<void>;

  // Import/Export
  exportEnv: (envId: string) => Promise<void>;
  importEnv: (data: Record<string, unknown>) => Promise<string>;

  // Diff
  computeDiff: (envIdA: string, envIdB: string) => Promise<void>;
  clearDiff: () => void;

  // Presets
  loadPresets: () => Promise<void>;
  togglePreset: (envId: string, isPreset: boolean) => Promise<void>;

  // Share
  generateShareLink: (envId: string) => Promise<string>;

  // Selection
  selectEnv: (envId: string | null) => void;
  clearError: () => void;
}

export const useEnvironmentStore = create<EnvironmentStore>((set, get) => ({
  environments: [],
  presets: [],
  loading: false,
  error: null,
  selectedEnvId: null,
  selectedDetail: null,
  diffResult: null,

  loadEnvironments: async () => {
    set({ loading: true, error: null });
    try {
      const environments = await fetchEnvironments();
      set({ environments, loading: false });
    } catch (e) {
      set({ error: String(e), loading: false });
    }
  },

  save: async (sessionId, name, description, tags) => {
    set({ error: null });
    try {
      const { id } = await saveEnvironment(sessionId, name, description, tags);
      await get().loadEnvironments();
      return id;
    } catch (e) {
      set({ error: String(e) });
      throw e;
    }
  },

  loadDetail: async (envId) => {
    set({ error: null });
    try {
      const detail = await fetchEnvironment(envId);
      set({ selectedDetail: detail, selectedEnvId: envId });
    } catch (e) {
      set({ error: String(e) });
    }
  },

  update: async (envId, changes) => {
    set({ error: null });
    try {
      await updateEnvironment(envId, changes);
      await get().loadEnvironments();
      if (get().selectedEnvId === envId) {
        await get().loadDetail(envId);
      }
    } catch (e) {
      set({ error: String(e) });
    }
  },

  remove: async (envId) => {
    set({ error: null });
    try {
      await deleteEnvironment(envId);
      if (get().selectedEnvId === envId) {
        set({ selectedEnvId: null, selectedDetail: null });
      }
      await get().loadEnvironments();
    } catch (e) {
      set({ error: String(e) });
    }
  },

  exportEnv: async (envId) => {
    try {
      const data = await exportEnvironment(envId);
      const blob = new Blob([typeof data === "string" ? data : JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const env = get().environments.find((e) => e.id === envId);
      a.download = `${env?.name ?? envId}.geny-env.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      set({ error: String(e) });
    }
  },

  importEnv: async (data) => {
    set({ error: null });
    try {
      const { id } = await importEnvironment(data);
      await get().loadEnvironments();
      return id;
    } catch (e) {
      set({ error: String(e) });
      throw e;
    }
  },

  computeDiff: async (envIdA, envIdB) => {
    set({ error: null });
    try {
      const diffResult = await diffEnvironments(envIdA, envIdB);
      set({ diffResult });
    } catch (e) {
      set({ error: String(e) });
    }
  },

  clearDiff: () => set({ diffResult: null }),

  loadPresets: async () => {
    try {
      const presets = await fetchPresets();
      set({ presets });
    } catch {
      /* presets are optional — silently ignore */
    }
  },

  togglePreset: async (envId, isPreset) => {
    set({ error: null });
    try {
      if (isPreset) {
        await unmarkPreset(envId);
      } else {
        await markAsPreset(envId);
      }
      await get().loadEnvironments();
      await get().loadPresets();
    } catch (e) {
      set({ error: String(e) });
    }
  },

  generateShareLink: async (envId) => {
    try {
      const { url } = await getShareLink(envId);
      return url;
    } catch (e) {
      set({ error: String(e) });
      throw e;
    }
  },

  selectEnv: (envId) => {
    set({ selectedEnvId: envId });
    if (envId === null) {
      set({ selectedDetail: null });
    }
  },

  clearError: () => set({ error: null }),
}));
