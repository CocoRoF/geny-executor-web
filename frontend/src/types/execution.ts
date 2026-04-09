export interface TokenUsage {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens: number;
  cache_read_input_tokens: number;
}

export interface PipelineResult {
  success: boolean;
  text: string;
  error: string;
  iterations: number;
  total_cost_usd: number;
  model: string;
  token_usage: TokenUsage;
}
