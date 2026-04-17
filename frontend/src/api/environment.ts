/* Environment & History API client */
import { apiFetch } from "./client";
import type {
  DiffEntry,
  EnvironmentDetail,
  EnvironmentDiffResult,
  EnvironmentSummary,
  ExecutionRun,
  PresetInfo,
} from "../types/editor";

// ── Environments ────────────────────────────────────────

export async function fetchEnvironments(): Promise<EnvironmentSummary[]> {
  const res = await apiFetch<{ environments: EnvironmentSummary[] }>(
    "/api/environments"
  );
  return res.environments;
}

export async function saveEnvironment(
  sessionId: string,
  name: string,
  description?: string,
  tags?: string[]
): Promise<{ id: string }> {
  return apiFetch("/api/environments", {
    method: "POST",
    body: JSON.stringify({
      session_id: sessionId,
      name,
      description: description ?? "",
      tags: tags ?? [],
    }),
  });
}

export async function fetchEnvironment(
  envId: string
): Promise<EnvironmentDetail> {
  return apiFetch<EnvironmentDetail>(`/api/environments/${envId}`);
}

export async function updateEnvironment(
  envId: string,
  changes: { name?: string; description?: string; tags?: string[] }
): Promise<EnvironmentDetail> {
  return apiFetch<EnvironmentDetail>(`/api/environments/${envId}`, {
    method: "PUT",
    body: JSON.stringify(changes),
  });
}

export async function deleteEnvironment(envId: string): Promise<void> {
  await apiFetch(`/api/environments/${envId}`, { method: "DELETE" });
}

export async function exportEnvironment(envId: string): Promise<string> {
  return apiFetch(`/api/environments/${envId}/export`);
}

export async function importEnvironment(
  data: Record<string, unknown>
): Promise<{ id: string }> {
  return apiFetch("/api/environments/import", {
    method: "POST",
    body: JSON.stringify({ data }),
  });
}

export async function diffEnvironments(
  envIdA: string,
  envIdB: string
): Promise<EnvironmentDiffResult> {
  return apiFetch("/api/environments/diff", {
    method: "POST",
    body: JSON.stringify({ env_id_a: envIdA, env_id_b: envIdB }),
  });
}

// ── Presets ─────────────────────────────────────────────

export async function fetchPresets(): Promise<PresetInfo[]> {
  const res = await apiFetch<{ presets: PresetInfo[] }>("/api/presets");
  return res.presets;
}

export async function markAsPreset(envId: string): Promise<void> {
  await apiFetch(`/api/environments/${envId}/preset`, { method: "POST" });
}

export async function unmarkPreset(envId: string): Promise<void> {
  await apiFetch(`/api/environments/${envId}/preset`, { method: "DELETE" });
}

// ── Share ───────────────────────────────────────────────

export async function getShareLink(envId: string): Promise<{ url: string }> {
  return apiFetch(`/api/environments/${envId}/share`);
}

// ── History ─────────────────────────────────────────────

export async function fetchSessionHistory(
  sessionId: string,
  limit = 50,
  offset = 0
): Promise<ExecutionRun[]> {
  const res = await apiFetch<{ runs: ExecutionRun[] }>(
    `/api/sessions/${sessionId}/history?limit=${limit}&offset=${offset}`
  );
  return res.runs;
}

export async function fetchAllHistory(
  limit = 50,
  offset = 0
): Promise<ExecutionRun[]> {
  const res = await apiFetch<{ runs: ExecutionRun[] }>(
    `/api/history?limit=${limit}&offset=${offset}`
  );
  return res.runs;
}

export async function fetchRunDetail(
  sessionId: string,
  runId: string
): Promise<ExecutionRun> {
  return apiFetch<ExecutionRun>(
    `/api/sessions/${sessionId}/history/${runId}`
  );
}

export async function fetchRunEvents(
  sessionId: string,
  runId: string
): Promise<Record<string, unknown>[]> {
  const res = await apiFetch<{ events: Record<string, unknown>[] }>(
    `/api/sessions/${sessionId}/history/${runId}/events`
  );
  return res.events;
}
