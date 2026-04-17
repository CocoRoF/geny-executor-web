/** History, analytics, and A/B test API client (Phase 6). */

import { apiFetch } from './client';
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

// ── Execution list / detail ─────────────────────────────

interface ListParams {
  limit?: number;
  offset?: number;
  model?: string;
  status?: string;
}

export async function fetchHistory(params: ListParams = {}): Promise<{
  runs: ExecutionSummary[];
  total: number;
}> {
  const qs = new URLSearchParams();
  if (params.limit) qs.set('limit', String(params.limit));
  if (params.offset) qs.set('offset', String(params.offset));
  if (params.model) qs.set('model', params.model);
  if (params.status) qs.set('status', params.status);
  const q = qs.toString();
  return apiFetch(`/api/history${q ? '?' + q : ''}`);
}

export async function fetchSessionHistory(
  sessionId: string,
  params: ListParams = {},
): Promise<{ runs: ExecutionSummary[]; total: number }> {
  const qs = new URLSearchParams();
  if (params.limit) qs.set('limit', String(params.limit));
  if (params.offset) qs.set('offset', String(params.offset));
  if (params.model) qs.set('model', params.model);
  if (params.status) qs.set('status', params.status);
  const q = qs.toString();
  return apiFetch(`/api/sessions/${sessionId}/history${q ? '?' + q : ''}`);
}

export async function fetchExecutionDetail(runId: string): Promise<ExecutionDetail> {
  return apiFetch(`/api/history/${runId}`);
}

export async function fetchSessionRunDetail(
  sessionId: string,
  runId: string,
): Promise<ExecutionDetail> {
  return apiFetch(`/api/sessions/${sessionId}/history/${runId}`);
}

export async function deleteRun(sessionId: string, runId: string): Promise<void> {
  await apiFetch(`/api/sessions/${sessionId}/history/${runId}`, { method: 'DELETE' });
}

export async function fetchRunEvents(
  sessionId: string,
  runId: string,
): Promise<{ events: Record<string, unknown>[] }> {
  return apiFetch(`/api/sessions/${sessionId}/history/${runId}/events`);
}

// ── Waterfall ───────────────────────────────────────────

export async function fetchWaterfall(runId: string): Promise<WaterfallData> {
  return apiFetch(`/api/history/${runId}/waterfall`);
}

// ── Analytics ───────────────────────────────────────────

export async function fetchStats(sessionId?: string): Promise<HistoryStats> {
  const qs = sessionId ? `?session_id=${sessionId}` : '';
  return apiFetch(`/api/analytics/stats${qs}`);
}

export async function fetchStageStats(
  sessionId?: string,
): Promise<{ stats: StageStats[] }> {
  const qs = sessionId ? `?session_id=${sessionId}` : '';
  return apiFetch(`/api/analytics/stage-stats${qs}`);
}

export async function fetchCostSummary(sessionId?: string): Promise<CostSummary> {
  const qs = sessionId ? `?session_id=${sessionId}` : '';
  return apiFetch(`/api/analytics/cost${qs}`);
}

export async function fetchCostTrend(
  sessionId?: string,
  granularity: string = 'hour',
  limit: number = 168,
): Promise<{ trend: CostTrendPoint[]; granularity: string }> {
  const qs = new URLSearchParams();
  if (sessionId) qs.set('session_id', sessionId);
  qs.set('granularity', granularity);
  qs.set('limit', String(limit));
  return apiFetch(`/api/analytics/cost-trend?${qs}`);
}

// ── A/B Test ────────────────────────────────────────────

export async function createABTest(
  envAId: string,
  envBId: string,
  userInput: string,
): Promise<{ exec_a_id: string; exec_b_id: string }> {
  return apiFetch('/api/ab-test', {
    method: 'POST',
    body: JSON.stringify({ env_a_id: envAId, env_b_id: envBId, user_input: userInput }),
  });
}

export async function fetchABComparison(
  execAId: string,
  execBId: string,
): Promise<ABComparison> {
  return apiFetch(`/api/ab-test/${execAId}/${execBId}`);
}
