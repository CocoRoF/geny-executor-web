export interface SessionInfo {
  session_id: string;
  preset: string;
  freshness: string;
  message_count: number;
  iteration: number;
  total_cost_usd: number;
}

export interface CreateSessionRequest {
  preset: string;
  api_key?: string;
  system_prompt?: string;
  model?: string;
  max_iterations?: number;
}
