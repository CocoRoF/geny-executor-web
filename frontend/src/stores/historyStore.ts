/** History & analytics Zustand store (Phase 6). */

import { create } from 'zustand';
import type {
  ABComparison,
  CostSummary,
  CostTrendPoint,
  ExecutionDetail,
  ExecutionSummary,
  HistoryStats,
  StageStats,
  WaterfallData,
} from '../types/history';
import {
  fetchHistory,
  fetchExecutionDetail,
  fetchWaterfall,
  fetchStats,
  fetchStageStats,
  fetchCostSummary,
  fetchCostTrend,
  createABTest,
  fetchABComparison,
  deleteRun,
} from '../api/history';

interface HistoryState {
  // List
  runs: ExecutionSummary[];
  total: number;
  loading: boolean;
  error: string | null;

  // Detail
  selectedRunId: string | null;
  detail: ExecutionDetail | null;
  waterfall: WaterfallData | null;

  // Analytics
  stats: HistoryStats | null;
  stageStats: StageStats[];
  costSummary: CostSummary | null;
  costTrend: CostTrendPoint[];

  // A/B Test
  abComparison: ABComparison | null;

  // Filters
  filterModel: string;
  filterStatus: string;
  page: number;
  pageSize: number;

  // Actions
  loadHistory: () => Promise<void>;
  loadDetail: (runId: string) => Promise<void>;
  loadWaterfall: (runId: string) => Promise<void>;
  loadStats: (sessionId?: string) => Promise<void>;
  loadStageStats: (sessionId?: string) => Promise<void>;
  loadCostSummary: (sessionId?: string) => Promise<void>;
  loadCostTrend: (sessionId?: string, granularity?: string) => Promise<void>;
  removeRun: (sessionId: string, runId: string) => Promise<void>;
  runABTest: (envAId: string, envBId: string, input: string) => Promise<void>;
  loadABComparison: (execAId: string, execBId: string) => Promise<void>;
  setFilter: (model?: string, status?: string) => void;
  setPage: (page: number) => void;
  selectRun: (runId: string | null) => void;
  clearError: () => void;
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  runs: [],
  total: 0,
  loading: false,
  error: null,
  selectedRunId: null,
  detail: null,
  waterfall: null,
  stats: null,
  stageStats: [],
  costSummary: null,
  costTrend: [],
  abComparison: null,
  filterModel: '',
  filterStatus: '',
  page: 0,
  pageSize: 20,

  loadHistory: async () => {
    const { filterModel, filterStatus, page, pageSize } = get();
    set({ loading: true, error: null });
    try {
      const res = await fetchHistory({
        limit: pageSize,
        offset: page * pageSize,
        model: filterModel || undefined,
        status: filterStatus || undefined,
      });
      set({ runs: res.runs, total: res.total, loading: false });
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },

  loadDetail: async (runId) => {
    set({ loading: true, error: null });
    try {
      const detail = await fetchExecutionDetail(runId);
      set({ detail, selectedRunId: runId, loading: false });
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },

  loadWaterfall: async (runId) => {
    try {
      const waterfall = await fetchWaterfall(runId);
      set({ waterfall });
    } catch (e: any) {
      set({ error: e.message });
    }
  },

  loadStats: async (sessionId) => {
    try {
      const stats = await fetchStats(sessionId);
      set({ stats });
    } catch (e: any) {
      set({ error: e.message });
    }
  },

  loadStageStats: async (sessionId) => {
    try {
      const res = await fetchStageStats(sessionId);
      set({ stageStats: res.stats });
    } catch (e: any) {
      set({ error: e.message });
    }
  },

  loadCostSummary: async (sessionId) => {
    try {
      const costSummary = await fetchCostSummary(sessionId);
      set({ costSummary });
    } catch (e: any) {
      set({ error: e.message });
    }
  },

  loadCostTrend: async (sessionId, granularity = 'hour') => {
    try {
      const res = await fetchCostTrend(sessionId, granularity);
      set({ costTrend: res.trend });
    } catch (e: any) {
      set({ error: e.message });
    }
  },

  removeRun: async (sessionId, runId) => {
    try {
      await deleteRun(sessionId, runId);
      set((s) => ({
        runs: s.runs.filter((r) => r.id !== runId),
        total: s.total - 1,
        detail: s.selectedRunId === runId ? null : s.detail,
        selectedRunId: s.selectedRunId === runId ? null : s.selectedRunId,
      }));
    } catch (e: any) {
      set({ error: e.message });
    }
  },

  runABTest: async (envAId, envBId, input) => {
    set({ loading: true, error: null });
    try {
      const res = await createABTest(envAId, envBId, input);
      const comparison = await fetchABComparison(res.exec_a_id, res.exec_b_id);
      set({ abComparison: comparison, loading: false });
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },

  loadABComparison: async (execAId, execBId) => {
    try {
      const comparison = await fetchABComparison(execAId, execBId);
      set({ abComparison: comparison });
    } catch (e: any) {
      set({ error: e.message });
    }
  },

  setFilter: (model, status) => {
    set({ filterModel: model || '', filterStatus: status || '', page: 0 });
  },

  setPage: (page) => set({ page }),

  selectRun: (runId) => set({ selectedRunId: runId, detail: null, waterfall: null }),

  clearError: () => set({ error: null }),
}));
