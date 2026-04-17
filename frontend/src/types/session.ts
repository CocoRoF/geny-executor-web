export interface SessionInfo {
  session_id: string;
  preset: string;
  freshness: string;
  message_count: number;
  iteration: number;
  total_cost_usd: number;
}

export interface CreateSessionRequest {
  preset?: string;
  api_key?: string;
  system_prompt?: string;
  model?: string;
  max_iterations?: number;
  // When provided, pipeline is built from the stored EnvironmentManifest and
  // the preset/system_prompt/model fields are ignored.
  env_id?: string;
}

export interface CreateSessionResponse {
  session_id: string;
  preset: string;
  env_id?: string;
}
