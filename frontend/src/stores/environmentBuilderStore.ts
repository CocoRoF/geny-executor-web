/* environmentBuilderStore — state for the v2 Environment Builder UI.
 *
 * Holds: the active template manifest being edited, the selected stage, the
 * session-less catalog (stage × artifact), and per-stage introspection cache
 * so that switching artifacts feels instant. All mutations here are
 * optimistic — the backing PATCH / PUT call is awaited and the manifest
 * response re-seeds local state to stay in sync.
 */
import { create } from "zustand";

import {
  fetchArtifactDetail,
  fetchCatalogFull,
  fetchStageArtifacts,
} from "../api/catalog";
import {
  createEnvironment,
  duplicateEnvironment,
  fetchEnvironmentV2,
  patchStageTemplate,
  replaceManifest,
} from "../api/environment";
import type {
  ArtifactInfo,
  StageIntrospection,
} from "../types/catalog";
import type {
  CreateEnvironmentPayload,
  EnvironmentDetailV2,
  EnvironmentManifest,
  StageManifestEntry,
  UpdateStageTemplatePayload,
} from "../types/environment";

type CatalogByOrder = Record<number, StageIntrospection>;
type ArtifactsByOrder = Record<number, ArtifactInfo[]>;
type IntrospectionCache = Record<string, StageIntrospection>;

function artifactKey(order: number, name: string): string {
  return `${order}:${name}`;
}

interface EnvironmentBuilderState {
  // ── Catalog (session-less, loaded once) ─────────────
  catalogByOrder: CatalogByOrder;
  artifactsByOrder: ArtifactsByOrder;
  introspectionCache: IntrospectionCache;
  catalogLoaded: boolean;
  catalogLoading: boolean;

  // ── Active template being edited ─────────────────────
  activeEnvId: string | null;
  activeDetail: EnvironmentDetailV2 | null;
  dirty: boolean;

  // ── UI focus ─────────────────────────────────────────
  selectedStageOrder: number | null;

  // ── Error plumbing ───────────────────────────────────
  error: string | null;
  saving: boolean;

  // ── Actions ──────────────────────────────────────────
  loadCatalog: () => Promise<void>;
  loadArtifactsForStage: (order: number) => Promise<ArtifactInfo[]>;
  loadArtifactIntrospection: (
    order: number,
    name: string
  ) => Promise<StageIntrospection>;

  createTemplate: (payload: CreateEnvironmentPayload) => Promise<string>;
  loadTemplate: (envId: string) => Promise<void>;
  closeTemplate: () => void;

  selectStage: (order: number | null) => void;

  patchStage: (
    order: number,
    payload: UpdateStageTemplatePayload
  ) => Promise<void>;
  saveManifest: (next: EnvironmentManifest) => Promise<void>;
  duplicate: (newName: string) => Promise<string | null>;

  clearError: () => void;
}

export const useEnvironmentBuilderStore = create<EnvironmentBuilderState>(
  (set, get) => ({
    catalogByOrder: {},
    artifactsByOrder: {},
    introspectionCache: {},
    catalogLoaded: false,
    catalogLoading: false,

    activeEnvId: null,
    activeDetail: null,
    dirty: false,

    selectedStageOrder: null,

    error: null,
    saving: false,

    loadCatalog: async () => {
      if (get().catalogLoaded || get().catalogLoading) return;
      set({ catalogLoading: true, error: null });
      try {
        const stages = await fetchCatalogFull();
        const byOrder: CatalogByOrder = {};
        const introspection: IntrospectionCache = { ...get().introspectionCache };
        for (const stage of stages) {
          byOrder[stage.order] = stage;
          introspection[artifactKey(stage.order, stage.artifact)] = stage;
        }
        set({
          catalogByOrder: byOrder,
          introspectionCache: introspection,
          catalogLoaded: true,
          catalogLoading: false,
        });
      } catch (e) {
        set({ error: String(e), catalogLoading: false });
      }
    },

    loadArtifactsForStage: async (order) => {
      const cached = get().artifactsByOrder[order];
      if (cached) return cached;
      try {
        const artifacts = await fetchStageArtifacts(order);
        set((s) => ({
          artifactsByOrder: { ...s.artifactsByOrder, [order]: artifacts },
        }));
        return artifacts;
      } catch (e) {
        set({ error: String(e) });
        return [];
      }
    },

    loadArtifactIntrospection: async (order, name) => {
      const key = artifactKey(order, name);
      const cached = get().introspectionCache[key];
      if (cached) return cached;
      const insp = await fetchArtifactDetail(order, name);
      set((s) => ({
        introspectionCache: { ...s.introspectionCache, [key]: insp },
      }));
      return insp;
    },

    createTemplate: async (payload) => {
      set({ error: null });
      try {
        const { id } = await createEnvironment(payload);
        await get().loadTemplate(id);
        return id;
      } catch (e) {
        set({ error: String(e) });
        throw e;
      }
    },

    loadTemplate: async (envId) => {
      set({ error: null });
      try {
        const detail = await fetchEnvironmentV2(envId);
        const firstOrder = detail.manifest?.stages?.[0]?.order ?? null;
        set({
          activeEnvId: envId,
          activeDetail: detail,
          dirty: false,
          selectedStageOrder: firstOrder,
        });
      } catch (e) {
        set({ error: String(e) });
      }
    },

    closeTemplate: () => {
      set({
        activeEnvId: null,
        activeDetail: null,
        dirty: false,
        selectedStageOrder: null,
      });
    },

    selectStage: (order) => set({ selectedStageOrder: order }),

    patchStage: async (order, payload) => {
      const envId = get().activeEnvId;
      if (!envId) return;
      set({ saving: true, error: null });
      try {
        const detail = await patchStageTemplate(envId, order, payload);
        set({ activeDetail: detail, dirty: false, saving: false });
      } catch (e) {
        set({ error: String(e), saving: false });
      }
    },

    saveManifest: async (next) => {
      const envId = get().activeEnvId;
      if (!envId) return;
      set({ saving: true, error: null });
      try {
        const detail = await replaceManifest(envId, next);
        set({ activeDetail: detail, dirty: false, saving: false });
      } catch (e) {
        set({ error: String(e), saving: false });
      }
    },

    duplicate: async (newName) => {
      const envId = get().activeEnvId;
      if (!envId) return null;
      try {
        const { id } = await duplicateEnvironment(envId, newName);
        return id;
      } catch (e) {
        set({ error: String(e) });
        return null;
      }
    },

    clearError: () => set({ error: null }),
  })
);

// Helper selectors (not part of the store API — keeps components terse).

export function selectActiveStage(
  state: EnvironmentBuilderState
): StageManifestEntry | null {
  const { selectedStageOrder, activeDetail } = state;
  if (selectedStageOrder == null) return null;
  const stages = activeDetail?.manifest?.stages ?? [];
  return stages.find((s) => s.order === selectedStageOrder) ?? null;
}

export function selectStageIntrospection(
  state: EnvironmentBuilderState,
  order: number,
  artifact: string
): StageIntrospection | null {
  return state.introspectionCache[artifactKey(order, artifact)] ?? null;
}
