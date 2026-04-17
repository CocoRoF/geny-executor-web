/* Stage Editor API client */
import { apiFetch } from "./client";
import type {
  MutationRecord,
  MutationResult,
  StageDetail,
} from "../types/editor";

export async function fetchStages(sessionId: string): Promise<StageDetail[]> {
  const res = await apiFetch<{ stages: StageDetail[] }>(
    `/api/sessions/${sessionId}/stages`
  );
  return res.stages;
}

export async function fetchStageDetail(
  sessionId: string,
  order: number
): Promise<StageDetail> {
  return apiFetch<StageDetail>(`/api/sessions/${sessionId}/stages/${order}`);
}

export async function swapStrategy(
  sessionId: string,
  order: number,
  slotName: string,
  newImpl: string,
  config?: Record<string, unknown>
): Promise<MutationResult> {
  return apiFetch<MutationResult>(
    `/api/sessions/${sessionId}/stages/${order}/strategy`,
    {
      method: "PATCH",
      body: JSON.stringify({ slot_name: slotName, new_impl: newImpl, config }),
    }
  );
}

export async function updateStageConfig(
  sessionId: string,
  order: number,
  config: Record<string, unknown>
): Promise<MutationResult> {
  return apiFetch<MutationResult>(
    `/api/sessions/${sessionId}/stages/${order}/config`,
    { method: "PATCH", body: JSON.stringify({ config }) }
  );
}

export async function setStageActive(
  sessionId: string,
  order: number,
  active: boolean
): Promise<MutationResult> {
  return apiFetch<MutationResult>(
    `/api/sessions/${sessionId}/stages/${order}/active`,
    { method: "PATCH", body: JSON.stringify({ active }) }
  );
}

export async function updateModelConfig(
  sessionId: string,
  changes: Record<string, unknown>
): Promise<MutationResult> {
  return apiFetch<MutationResult>(`/api/sessions/${sessionId}/model`, {
    method: "PATCH",
    body: JSON.stringify(changes),
  });
}

export async function updatePipelineConfig(
  sessionId: string,
  changes: Record<string, unknown>
): Promise<MutationResult> {
  return apiFetch<MutationResult>(
    `/api/sessions/${sessionId}/pipeline-config`,
    { method: "PATCH", body: JSON.stringify(changes) }
  );
}

export async function fetchMutationLog(
  sessionId: string
): Promise<MutationRecord[]> {
  const res = await apiFetch<{ mutations: MutationRecord[] }>(
    `/api/sessions/${sessionId}/mutations`
  );
  return res.mutations;
}

export async function createSnapshot(
  sessionId: string
): Promise<Record<string, unknown>> {
  return apiFetch<Record<string, unknown>>(
    `/api/sessions/${sessionId}/snapshot`,
    { method: "POST" }
  );
}

export async function restoreSnapshot(
  sessionId: string,
  snapshot: Record<string, unknown>
): Promise<MutationResult> {
  return apiFetch<MutationResult>(`/api/sessions/${sessionId}/restore`, {
    method: "POST",
    body: JSON.stringify(snapshot),
  });
}
