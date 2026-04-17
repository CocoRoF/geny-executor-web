/* Tool Manager API client */
import { apiFetch } from "./client";
import type {
  MCPServer,
  ToolInfo,
  ToolPreset,
  ToolScope,
  ToolTestResult,
} from "../types/editor";

// ── Tool CRUD ───────────────────────────────────────────

export async function fetchTools(sessionId: string): Promise<ToolInfo[]> {
  const res = await apiFetch<{ tools: ToolInfo[] }>(
    `/api/sessions/${sessionId}/tools`
  );
  return res.tools;
}

export async function fetchTool(
  sessionId: string,
  name: string
): Promise<ToolInfo> {
  return apiFetch<ToolInfo>(`/api/sessions/${sessionId}/tools/${name}`);
}

export async function deleteTool(
  sessionId: string,
  name: string
): Promise<void> {
  await apiFetch(`/api/sessions/${sessionId}/tools/${name}`, {
    method: "DELETE",
  });
}

export async function testTool(
  sessionId: string,
  name: string,
  input: Record<string, unknown>
): Promise<ToolTestResult> {
  return apiFetch<ToolTestResult>(
    `/api/sessions/${sessionId}/tools/${name}/test`,
    { method: "POST", body: JSON.stringify({ input }) }
  );
}

// ── Ad-hoc Tools ────────────────────────────────────────

export async function createAdhocTool(
  sessionId: string,
  definition: Record<string, unknown>
): Promise<ToolInfo> {
  return apiFetch<ToolInfo>(`/api/sessions/${sessionId}/tools/adhoc`, {
    method: "POST",
    body: JSON.stringify(definition),
  });
}

export async function updateAdhocTool(
  sessionId: string,
  name: string,
  definition: Record<string, unknown>
): Promise<ToolInfo> {
  return apiFetch<ToolInfo>(
    `/api/sessions/${sessionId}/tools/adhoc/${name}`,
    { method: "PUT", body: JSON.stringify(definition) }
  );
}

// ── Presets ─────────────────────────────────────────────

export async function fetchToolPresets(
  sessionId: string
): Promise<ToolPreset[]> {
  const res = await apiFetch<{ presets: ToolPreset[] }>(
    `/api/sessions/${sessionId}/tool-presets`
  );
  return res.presets;
}

export async function applyToolPreset(
  sessionId: string,
  presetName: string
): Promise<{ applied: string; tool_count: number }> {
  return apiFetch(`/api/sessions/${sessionId}/tool-presets/${presetName}`, {
    method: "POST",
  });
}

// ── MCP Servers ─────────────────────────────────────────

export async function fetchMCPServers(
  sessionId: string
): Promise<MCPServer[]> {
  const res = await apiFetch<{ servers: MCPServer[] }>(
    `/api/sessions/${sessionId}/mcp-servers`
  );
  return res.servers;
}

export async function connectMCPServer(
  sessionId: string,
  config: Record<string, unknown>
): Promise<MCPServer> {
  return apiFetch<MCPServer>(`/api/sessions/${sessionId}/mcp-servers`, {
    method: "POST",
    body: JSON.stringify(config),
  });
}

export async function disconnectMCPServer(
  sessionId: string,
  name: string
): Promise<void> {
  await apiFetch(`/api/sessions/${sessionId}/mcp-servers/${name}`, {
    method: "DELETE",
  });
}

export async function testMCPServer(
  sessionId: string,
  name: string
): Promise<Record<string, unknown>> {
  return apiFetch(`/api/sessions/${sessionId}/mcp-servers/${name}/test`, {
    method: "POST",
  });
}

// ── Tool Scope ──────────────────────────────────────────

export async function fetchToolScope(sessionId: string): Promise<ToolScope> {
  return apiFetch<ToolScope>(`/api/sessions/${sessionId}/tool-scope`);
}

export async function updateToolScope(
  sessionId: string,
  scope: Partial<ToolScope>
): Promise<ToolScope> {
  return apiFetch<ToolScope>(`/api/sessions/${sessionId}/tool-scope`, {
    method: "PUT",
    body: JSON.stringify(scope),
  });
}
