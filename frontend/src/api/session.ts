import { apiFetch } from "./client";
import type { CreateSessionRequest, SessionInfo } from "../types/session";

export async function fetchConfig(): Promise<{ api_key_configured: boolean }> {
  return apiFetch("/api/config");
}

export async function createSession(
  req: CreateSessionRequest
): Promise<{ session_id: string; preset: string }> {
  return apiFetch("/api/sessions", {
    method: "POST",
    body: JSON.stringify(req),
  });
}

export async function fetchSessions(): Promise<SessionInfo[]> {
  const data = await apiFetch<{ sessions: SessionInfo[] }>("/api/sessions");
  return data.sessions;
}

export async function deleteSession(id: string): Promise<void> {
  await apiFetch(`/api/sessions/${id}`, { method: "DELETE" });
}
