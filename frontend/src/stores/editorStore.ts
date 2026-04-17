/* Editor store — stage editing state management */
import { create } from "zustand";
import type {
  MutationRecord,
  MutationResult,
  StageDetail,
} from "../types/editor";
import * as api from "../api/stageEditor";

interface EditorState {
  // Edit mode
  editMode: boolean;
  setEditMode: (v: boolean) => void;

  // Stage details cache
  stageDetails: Record<number, StageDetail>;
  stageDetailsLoading: boolean;
  loadStages: (sessionId: string) => Promise<void>;
  loadStageDetail: (sessionId: string, order: number) => Promise<void>;
  updateStageDetailLocal: (order: number, stage: StageDetail) => void;

  // Mutations
  lastResult: MutationResult | null;
  swapStrategy: (
    sessionId: string,
    order: number,
    slotName: string,
    newImpl: string,
    config?: Record<string, unknown>
  ) => Promise<MutationResult>;
  updateStageConfig: (
    sessionId: string,
    order: number,
    config: Record<string, unknown>
  ) => Promise<MutationResult>;
  setStageActive: (
    sessionId: string,
    order: number,
    active: boolean
  ) => Promise<MutationResult>;
  updateModelConfig: (
    sessionId: string,
    changes: Record<string, unknown>
  ) => Promise<MutationResult>;
  updatePipelineConfig: (
    sessionId: string,
    changes: Record<string, unknown>
  ) => Promise<MutationResult>;

  // Mutation log
  mutationLog: MutationRecord[];
  loadMutationLog: (sessionId: string) => Promise<void>;

  // Snapshot
  createSnapshot: (sessionId: string) => Promise<Record<string, unknown>>;
  restoreSnapshot: (
    sessionId: string,
    snap: Record<string, unknown>
  ) => Promise<MutationResult>;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  editMode: false,
  setEditMode: (v) => set({ editMode: v }),

  stageDetails: {},
  stageDetailsLoading: false,

  loadStages: async (sessionId) => {
    set({ stageDetailsLoading: true });
    try {
      const stages = await api.fetchStages(sessionId);
      const map: Record<number, StageDetail> = {};
      for (const s of stages) map[s.order] = s;
      set({ stageDetails: map });
    } finally {
      set({ stageDetailsLoading: false });
    }
  },

  loadStageDetail: async (sessionId, order) => {
    const stage = await api.fetchStageDetail(sessionId, order);
    set((s) => ({
      stageDetails: { ...s.stageDetails, [order]: stage },
    }));
  },

  updateStageDetailLocal: (order, stage) => {
    set((s) => ({
      stageDetails: { ...s.stageDetails, [order]: stage },
    }));
  },

  lastResult: null,

  swapStrategy: async (sessionId, order, slotName, newImpl, config) => {
    const result = await api.swapStrategy(
      sessionId,
      order,
      slotName,
      newImpl,
      config
    );
    set({ lastResult: result });
    if (result.success && result.updated_stage) {
      get().updateStageDetailLocal(order, result.updated_stage);
    }
    return result;
  },

  updateStageConfig: async (sessionId, order, config) => {
    const result = await api.updateStageConfig(sessionId, order, config);
    set({ lastResult: result });
    if (result.success && result.updated_stage) {
      get().updateStageDetailLocal(order, result.updated_stage);
    }
    return result;
  },

  setStageActive: async (sessionId, order, active) => {
    const result = await api.setStageActive(sessionId, order, active);
    set({ lastResult: result });
    if (result.success) {
      await get().loadStageDetail(sessionId, order);
    }
    return result;
  },

  updateModelConfig: async (sessionId, changes) => {
    const result = await api.updateModelConfig(sessionId, changes);
    set({ lastResult: result });
    return result;
  },

  updatePipelineConfig: async (sessionId, changes) => {
    const result = await api.updatePipelineConfig(sessionId, changes);
    set({ lastResult: result });
    return result;
  },

  mutationLog: [],
  loadMutationLog: async (sessionId) => {
    const log = await api.fetchMutationLog(sessionId);
    set({ mutationLog: log });
  },

  createSnapshot: async (sessionId) => {
    return api.createSnapshot(sessionId);
  },

  restoreSnapshot: async (sessionId, snap) => {
    const result = await api.restoreSnapshot(sessionId, snap);
    set({ lastResult: result });
    if (result.success) {
      await get().loadStages(sessionId);
    }
    return result;
  },
}));
