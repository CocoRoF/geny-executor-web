export interface PipelineEvent {
  type: string;
  stage: string;
  iteration: number;
  timestamp: string;
  data: Record<string, unknown>;
}
