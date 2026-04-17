/** History, analytics, and A/B test types (Phase 6). */

// ── Execution ───────────────────────────────────────────

export interface ExecutionSummary {
  id: string;
  session_id: string;
  model: string;
  input_text: string;
  result_text: string | null;
  success: boolean;
  status: 'running' | 'completed' | 'error' | 'cancelled';
  iterations: number;
  total_cost_usd: number;
  duration_ms: number;
  total_tokens: number;
  tool_call_count: number;
  environment_id: string | null;
  created_at: string;
  tags: string[];
}

export interface StageTiming {
  iteration: number;
  stage_order: number;
  stage_name: string;
  started_at: string;
  finished_at: string;
  duration_ms: number;
  input_tokens: number;
  output_tokens: number;
  was_cached: boolean;
  was_skipped: boolean;
  tool_name: string | null;
  tool_success: boolean | null;
  tool_duration_ms: number | null;
}

export interface ToolCallRecord {
  iteration: number;
  tool_name: string;
  called_at: string;
  input_json: string | null;
  output_text: string | null;
  is_error: boolean;
  duration_ms: number;
}

export interface ExecutionDetail extends ExecutionSummary {
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens: number;
  cache_write_tokens: number;
  thinking_tokens: number;
  error_type: string | null;
  error_message: string | null;
  error_stage: number | null;
  finished_at: string | null;
  stage_timings: StageTiming[];
  tool_call_records: ToolCallRecord[];
}

// ── Waterfall ───────────────────────────────────────────

export interface StageWaterfall {
  order: number;
  name: string;
  duration_ms: number;
  was_cached: boolean;
  was_skipped: boolean;
  tokens: number;
}

export interface IterationWaterfall {
  iteration: number;
  stages: StageWaterfall[];
}

export interface WaterfallData {
  execution_id: string;
  total_duration_ms: number;
  iterations: IterationWaterfall[];
}

// ── Stage Stats ─────────────────────────────────────────

export interface StageStats {
  stage_order: number;
  stage_name: string;
  count: number;
  avg_ms: number;
  min_ms: number;
  max_ms: number;
  cache_hits: number;
  skips: number;
  avg_input_tokens: number;
  avg_output_tokens: number;
}

// ── Cost Analysis ───────────────────────────────────────

export interface ModelCost {
  model: string;
  executions: number;
  total_cost: number;
  total_tokens: number;
  total_input: number;
  total_output: number;
  total_cache_read: number;
  total_cache_write: number;
  total_thinking: number;
  total_tools: number;
  avg_cost: number;
}

export interface CostSummary {
  session_id: string | null;
  by_model: ModelCost[];
  total_cost: number;
  total_executions: number;
}

export interface CostTrendPoint {
  period: string;
  executions: number;
  cost: number;
  tokens: number;
}

// ── A/B Test ────────────────────────────────────────────

export interface ABSide {
  execution_id: string;
  model: string;
  status: string;
  result_text: string;
  cost_usd: number;
  duration_ms: number;
  total_tokens: number;
  iterations: number;
  tool_calls: number;
}

export interface ABComparison {
  env_a: ABSide;
  env_b: ABSide;
  diff: {
    cost_diff: number;
    duration_diff: number;
    token_diff: number;
  };
}

// ── Global Stats ────────────────────────────────────────

export interface HistoryStats {
  total: number;
  completed: number;
  errors: number;
  total_cost: number;
  total_tokens: number;
  avg_duration_ms: number;
}
