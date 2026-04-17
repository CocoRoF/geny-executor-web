/* /api/catalog — session-less artifact catalog.
 *
 * The Environment Builder pulls stage/artifact metadata from these endpoints
 * before any pipeline exists, so it can render the stage grid and
 * schema-driven config forms without needing a live session.
 */
import { apiFetch } from "./client";
import type {
  ArtifactInfo,
  CatalogArtifactListResponse,
  CatalogFullResponse,
  CatalogStageListResponse,
  StageIntrospection,
  StageSummary,
} from "../types/catalog";

export async function fetchCatalogStages(): Promise<StageSummary[]> {
  const data = await apiFetch<CatalogStageListResponse>("/api/catalog/stages");
  return data.stages;
}

export async function fetchCatalogFull(): Promise<StageIntrospection[]> {
  const data = await apiFetch<CatalogFullResponse>("/api/catalog/full");
  return data.stages;
}

export async function fetchStageDetail(
  order: number
): Promise<StageIntrospection> {
  return apiFetch<StageIntrospection>(`/api/catalog/stages/${order}`);
}

export async function fetchStageArtifacts(order: number): Promise<ArtifactInfo[]> {
  const data = await apiFetch<CatalogArtifactListResponse>(
    `/api/catalog/stages/${order}/artifacts`
  );
  return data.artifacts;
}

export async function fetchArtifactDetail(
  order: number,
  name: string
): Promise<StageIntrospection> {
  return apiFetch<StageIntrospection>(
    `/api/catalog/stages/${order}/artifacts/${encodeURIComponent(name)}`
  );
}
