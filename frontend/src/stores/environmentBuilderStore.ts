/* environmentBuilderStore — local-draft state for the v2 Environment Builder.
 *
 * Design — edits are *local JSON mutations*, not per-keystroke network
 * calls. The store holds:
 *
 *   - `activeDetail`   : server-truth EnvironmentDetailV2, refreshed on
 *                        load and after each successful save.
 *   - `draft`          : a deep clone of the server manifest that all tab
 *                        widgets mutate directly. This is what the left
 *                        pane / right pane render off.
 *   - `dirty`          : true once `draft` has been mutated since the
 *                        last load/save; false again after `saveDraft`
 *                        or `discardDraft`.
 *
 * The single network writer is `saveDraft()` — it PUTs the whole
 * manifest in one round-trip (backend: `PUT /api/environments/{id}/manifest`).
 * Per-stage PATCH is no longer exercised by the builder; the endpoint
 * still exists for callers that want it.
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

/** Deep-clone the manifest so the draft has no shared references with
 * `activeDetail.manifest`. Plain JSON round-trip is sufficient — every
 * field is serialisable (strings / numbers / booleans / nested
 * objects / arrays). */
function cloneManifest(m: EnvironmentManifest): EnvironmentManifest {
  return JSON.parse(JSON.stringify(m)) as EnvironmentManifest;
}

/** Flip any required stage that was persisted as `active=false` back on.
 *
 * Older manifests (saved before v0.8.5) may carry deactivated Input / API /
 * Parse / Yield entries. The UI now disallows that, so correct the draft on
 * load. Returns `true` when any stage was adjusted so callers can surface the
 * correction to the user by marking the draft dirty. */
function coerceRequiredStagesActive(
  manifest: EnvironmentManifest,
  catalog: CatalogByOrder
): { manifest: EnvironmentManifest; changed: boolean } {
  let changed = false;
  const stages = manifest.stages.map((s) => {
    const insp = catalog[s.order];
    if (insp?.required === true && !s.active) {
      changed = true;
      return { ...s, active: true };
    }
    return s;
  });
  return { manifest: changed ? { ...manifest, stages } : manifest, changed };
}

/** Immutably apply an `UpdateStageTemplatePayload` to one stage entry. */
function applyStagePatch(
  entry: StageManifestEntry,
  payload: UpdateStageTemplatePayload
): StageManifestEntry {
  const next: StageManifestEntry = { ...entry };
  if (payload.artifact !== undefined) next.artifact = payload.artifact;
  if (payload.strategies !== undefined) next.strategies = { ...payload.strategies };
  if (payload.strategy_configs !== undefined)
    next.strategy_configs = { ...payload.strategy_configs };
  if (payload.config !== undefined) next.config = { ...payload.config };
  if (payload.tool_binding !== undefined) next.tool_binding = payload.tool_binding;
  if (payload.model_override !== undefined)
    next.model_override = payload.model_override;
  if (payload.chain_order !== undefined)
    next.chain_order = { ...payload.chain_order };
  if (payload.active !== undefined) next.active = payload.active;
  return next;
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
  draft: EnvironmentManifest | null;
  dirty: boolean;

  // ── UI focus ─────────────────────────────────────────
  selectedStageOrder: number | null;

  // ── Error plumbing ───────────────────────────────────
  error: string | null;
  saving: boolean;

  // ── Catalog actions ──────────────────────────────────
  loadCatalog: () => Promise<void>;
  loadArtifactsForStage: (order: number) => Promise<ArtifactInfo[]>;
  loadArtifactIntrospection: (
    order: number,
    name: string
  ) => Promise<StageIntrospection>;

  // ── Template lifecycle ───────────────────────────────
  createTemplate: (payload: CreateEnvironmentPayload) => Promise<string>;
  loadTemplate: (envId: string) => Promise<void>;
  closeTemplate: () => void;
  duplicate: (newName: string) => Promise<string | null>;

  // ── Local draft mutations (no network) ───────────────
  selectStage: (order: number | null) => void;
  updateStageDraft: (
    order: number,
    payload: UpdateStageTemplatePayload
  ) => void;

  // ── Save / discard (network happens here and only here) ──
  saveDraft: () => Promise<boolean>;
  discardDraft: () => void;

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
    draft: null,
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
        // Make sure the catalog is available before we load — the required-
        // stage coercion below needs `catalogByOrder[order].required` to know
        // which stages to flip back on. Cheap no-op if already loaded.
        await get().loadCatalog();
        const detail = await fetchEnvironmentV2(envId);
        const manifest = detail.manifest ?? null;
        let draftManifest = manifest ? cloneManifest(manifest) : null;
        let dirty = false;
        if (draftManifest) {
          const { manifest: corrected, changed } = coerceRequiredStagesActive(
            draftManifest,
            get().catalogByOrder
          );
          draftManifest = corrected;
          dirty = changed;
        }
        const firstOrder = draftManifest?.stages?.[0]?.order ?? null;
        set({
          activeEnvId: envId,
          activeDetail: detail,
          draft: draftManifest,
          dirty,
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
        draft: null,
        dirty: false,
        selectedStageOrder: null,
      });
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

    selectStage: (order) => set({ selectedStageOrder: order }),

    updateStageDraft: (order, payload) => {
      const draft = get().draft;
      if (!draft) return;
      const nextStages = draft.stages.map((s) =>
        s.order === order ? applyStagePatch(s, payload) : s
      );
      set({
        draft: { ...draft, stages: nextStages },
        dirty: true,
      });
    },

    saveDraft: async () => {
      const { activeEnvId, draft } = get();
      if (!activeEnvId || !draft) return false;
      set({ saving: true, error: null });
      try {
        const detail = await replaceManifest(activeEnvId, draft);
        const saved = detail.manifest ?? null;
        set({
          activeDetail: detail,
          // Re-seed the draft from the server response so any server-side
          // normalisation (timestamp bumps, coerced enum values, etc.)
          // becomes the new editing baseline.
          draft: saved ? cloneManifest(saved) : null,
          dirty: false,
          saving: false,
        });
        return true;
      } catch (e) {
        set({ error: String(e), saving: false });
        return false;
      }
    },

    discardDraft: () => {
      const { activeDetail } = get();
      const saved = activeDetail?.manifest ?? null;
      set({
        draft: saved ? cloneManifest(saved) : null,
        dirty: false,
      });
    },

    clearError: () => set({ error: null }),
  })
);

// Helper selectors (not part of the store API — keeps components terse).

export function selectActiveStage(
  state: EnvironmentBuilderState
): StageManifestEntry | null {
  const { selectedStageOrder, draft } = state;
  if (selectedStageOrder == null || !draft) return null;
  return draft.stages.find((s) => s.order === selectedStageOrder) ?? null;
}

export function selectStageIntrospection(
  state: EnvironmentBuilderState,
  order: number,
  artifact: string
): StageIntrospection | null {
  return state.introspectionCache[artifactKey(order, artifact)] ?? null;
}
