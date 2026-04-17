/* v2 EnvironmentManifest types — mirror geny_executor.EnvironmentManifest.
 *
 * Kept separate from types/editor.ts so the Environment Builder can evolve
 * its schema without breaking the stage-editor/tool-manager code paths.
 */

export interface EnvironmentMetadata {
  id: string;
  name: string;
  description: string;
  author?: string;
  tags: string[];
  created_at: string;
  updated_at: string;
  base_preset?: string;
}

export interface StageToolBinding {
  mode: "inherit" | "allowlist" | "blocklist";
  patterns: string[];
}

export interface StageModelOverride {
  model?: string;
  system_prompt?: string;
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  [key: string]: unknown;
}

export interface StageManifestEntry {
  order: number;
  name: string;
  active: boolean;
  artifact: string;
  strategies: Record<string, string>;
  strategy_configs: Record<string, Record<string, unknown>>;
  config: Record<string, unknown>;
  tool_binding?: StageToolBinding | null;
  model_override?: StageModelOverride | null;
  chain_order: Record<string, string[]>;
}

export interface ToolsSnapshot {
  adhoc: Array<Record<string, unknown>>;
  mcp_servers: Array<Record<string, unknown>>;
  global_allowlist: string[];
  global_blocklist: string[];
}

export interface EnvironmentManifest {
  version: string;
  metadata: EnvironmentMetadata;
  model: Record<string, unknown>;
  pipeline: Record<string, unknown>;
  stages: StageManifestEntry[];
  tools?: ToolsSnapshot;
}

// ── Request/response shapes for the v2 endpoints ─────────

export type CreateEnvironmentMode = "blank" | "from_session" | "from_preset";

export interface CreateEnvironmentPayload {
  mode: CreateEnvironmentMode;
  name: string;
  description?: string;
  tags?: string[];
  session_id?: string;
  preset_name?: string;
}

export interface UpdateStageTemplatePayload {
  artifact?: string;
  strategies?: Record<string, string>;
  strategy_configs?: Record<string, Record<string, unknown>>;
  config?: Record<string, unknown>;
  tool_binding?: StageToolBinding | null;
  model_override?: StageModelOverride | null;
  chain_order?: Record<string, string[]>;
  active?: boolean;
}

export interface EnvironmentDetailV2 {
  id: string;
  name: string;
  description: string;
  tags: string[];
  created_at: string;
  updated_at: string;
  manifest?: EnvironmentManifest | null;
  snapshot?: Record<string, unknown> | null;
}
