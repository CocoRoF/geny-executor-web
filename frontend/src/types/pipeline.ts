export interface StrategyInfo {
  slot_name: string;
  current_impl: string;
  available_impls: string[];
  config: Record<string, unknown>;
}

export interface StageDescription {
  name: string;
  order: number;
  category: string;
  is_active: boolean;
  strategies: StrategyInfo[];
}

export interface PipelineDescribeResponse {
  name: string;
  stages: StageDescription[];
}

export interface PresetInfo {
  name: string;
  description: string;
  active_stages: number[];
}
