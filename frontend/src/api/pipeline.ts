import { apiFetch } from "./client";
import type { PipelineDescribeResponse, PresetInfo } from "../types/pipeline";

export async function fetchPipelineDescription(
  preset: string,
  engine: string = "executor",
): Promise<PipelineDescribeResponse> {
  return apiFetch(`/api/pipeline/describe?preset=${preset}&engine=${engine}`);
}

export async function fetchPresets(engine: string = "executor"): Promise<PresetInfo[]> {
  const data = await apiFetch<{ presets: PresetInfo[] }>(`/api/pipeline/presets?engine=${engine}`);
  return data.presets;
}
