import { apiFetch } from "./client";
import type { PipelineDescribeResponse, PresetInfo } from "../types/pipeline";

export async function fetchPipelineDescription(
  preset: string,
): Promise<PipelineDescribeResponse> {
  return apiFetch(`/api/pipeline/describe?preset=${encodeURIComponent(preset)}`);
}

export async function fetchPresets(): Promise<PresetInfo[]> {
  const data = await apiFetch<{ presets: PresetInfo[] }>("/api/pipeline/presets");
  return data.presets;
}
