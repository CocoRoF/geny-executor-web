/* Types for the Stage Editor and Tool Manager */

// ── Stage Editor ────────────────────────────────────────

export interface StrategyDetailInfo {
  slot_name: string;
  current_impl: string;
  available_impls: string[];
  config: Record<string, unknown>;
  config_schema: Record<string, unknown>;
  impl_descriptions: Record<string, string>;
}

export interface StageDetail {
  name: string;
  order: number;
  category: string;
  is_active: boolean;
  strategies: StrategyDetailInfo[];
  config_schema: Record<string, unknown>;
  current_config: Record<string, unknown>;
}

export interface MutationResult {
  success: boolean;
  message: string;
  mutation_type: string;
  details: Record<string, unknown>;
  updated_stage?: StageDetail;
}

export interface MutationRecord {
  timestamp: string;
  mutation_type: string;
  target: string;
  details: Record<string, unknown>;
}

// ── Tool Manager ────────────────────────────────────────

export interface ToolInfo {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
  type: "built_in" | "adhoc" | "mcp";
  source: string;
  enabled: boolean;
  tags: string[];
  definition?: Record<string, unknown>;
  mcp_server?: string;
}

export interface ToolTestResult {
  success: boolean;
  result: string;
  is_error: boolean;
  execution_time_ms: number;
  error?: string;
}

export interface MCPServer {
  name: string;
  connected: boolean;
  transport: string;
  tool_count: number;
  tools: string[];
  error?: string;
}

export interface ToolPreset {
  name: string;
  description: string;
  tools: string[];
  tags: string[];
}

export interface ToolScope {
  global_scope: Record<string, unknown>;
  stage_scopes: Record<number, Record<string, unknown>>;
}

// ── Environment ─────────────────────────────────────────

export interface EnvironmentSummary {
  id: string;
  name: string;
  description: string;
  tags: string[];
  created_at: string;
  updated_at: string;
  stage_count: number;
  model: string;
}

export interface EnvironmentDetail {
  id: string;
  name: string;
  description: string;
  tags: string[];
  created_at: string;
  updated_at: string;
  snapshot: Record<string, unknown>;
}

export interface DiffEntry {
  path: string;
  change_type: "added" | "removed" | "changed";
  old_value: unknown;
  new_value: unknown;
}

export interface EnvironmentDiffResult {
  identical: boolean;
  entries: DiffEntry[];
  summary: { added: number; removed: number; changed: number };
}

export interface PresetInfo {
  name: string;
  description: string;
  preset_type: "built_in" | "user";
  tags: string[];
  environment_id?: string;
}

// ── History ─────────────────────────────────────────────

export interface ExecutionRun {
  id: string;
  session_id: string;
  input_text: string;
  result_text: string;
  success: boolean;
  iterations: number;
  total_cost_usd: number;
  model: string;
  created_at: string;
  duration_ms?: number;
}
