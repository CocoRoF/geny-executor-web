# Changelog

All notable changes to `geny-executor-web` are documented here.

## v0.8.5 — 2026-04-17

### Added — Pipeline view: run saved environments

The Pipeline mode header previously only offered preset names; to run a
saved environment you had to navigate to the Environments tab, open the
builder, and start a session from there. The Pipeline tab is now a true
launcher for environments too:

- **Unified picker.** The header dropdown groups choices under two
  `<optgroup>`s — `Presets` (agent / chat / evaluator / minimal /
  geny_vtuber) and `Environments` (user-saved, loaded via
  `GET /api/environments`). Picking either updates the canvas to show
  that pipeline's 16 stages with correct active/inactive shading.
- **Session creation respects the selection.** When an environment is
  active, `InputPanel` creates the session with `env_id` instead of
  `preset`. The backend already built the pipeline from the stored
  `EnvironmentManifest` (session router `if body.env_id:`) — this just
  wires the UI to the existing path.
- **Canvas renders env manifests.** `pipelineStore.loadPipelineFromEnv`
  fetches the env detail, maps `StageManifestEntry[]` →
  `StageDescription[]` (reading `active` as `is_active`, materialising
  `strategies` from the manifest's `strategies` map), and sets
  `activeEnvId`. Switching back to a preset clears it.

### Added — Builder refuses to deactivate required stages

Four stages — `s01_input`, `s06_api`, `s09_parse`, `s16_yield` — are
structurally required by every pipeline (they mirror the `minimal`
PipelineBuilder preset). Previously the Environment Builder's Active
checkbox let users turn any of them off, producing manifests that
looked valid but could never run a pipeline. Now:

- **Library surface (`geny-executor` v0.13.3).** `StageIntrospection`
  carries a boolean `required` field. The web catalog type treats it
  as optional (`required?: boolean`) so older backends degrade to "all
  optional" rather than erroring.
- **`StageCard` respects the flag.** When the current stage's
  introspection has `required=true`, the Active checkbox is `disabled`,
  the label reads "Active · Required", and the row's cursor changes to
  `not-allowed` with a tooltip explaining why. `handleActiveToggle` is
  a no-op on required stages.
- **Auto-correct on load.** `environmentBuilderStore.loadTemplate`
  inspects every stage against the catalog and flips any required
  stage that was persisted as `active=false` back to `true`. The
  correction marks the draft `dirty=true` so the user sees a Save
  affordance and the baseline is updated on the next save.

### Upgraded
- `geny-executor` pin: `>=0.13.2 → >=0.13.3`
- `geny-executor-web` backend: `0.8.4 → 0.8.5`
- `geny-executor-web` frontend: `0.8.4 → 0.8.5`

## v0.8.4 — 2026-04-17

### Changed — Environment Builder: local draft + single Save

The builder no longer PATCHes the backend on every field edit. Every
keystroke, checkbox, artifact switch, and chain reorder previously
fired a debounced `PATCH /api/environments/{id}/stages/{order}`
round-trip, which meant a 16-stage edit session racked up dozens of
writes and the "current state" was spread across a server row and a
volatile in-flight buffer. Now:

- **All mutations are local.** The store holds a `draft: EnvironmentManifest`
  — a deep clone of the server's manifest. `updateStageDraft(order, payload)`
  immutably mutates one stage entry in the draft and flips `dirty=true`.
  No network call.
- **`PUT /api/environments/{id}/manifest` is the single writer.** The
  new `saveDraft()` action sends the whole manifest in one request;
  on success the server response re-seeds the draft (picking up any
  server-side normalisation) and clears `dirty`.
- **Explicit Save / Discard in the header.** The Save button is the
  primary accent-coloured action while dirty, greyed out otherwise.
  Discard confirms, then resets the draft to the server-saved baseline.
- **"Start session" saves first.** Instantiating a session always
  reads the server's saved manifest — running a dirty draft would
  silently execute the old config. If dirty, `saveDraft()` runs
  before `createSessionFromEnv`.
- **"Close" and "Duplicate" prompt on dirty.** Close confirms before
  discarding; Duplicate warns that the copy comes from the saved
  baseline, not the draft.
- **`beforeunload` guard.** Reloading the tab or closing the browser
  while dirty triggers the browser's native leave-site dialog.

**Why**: every per-field PATCH was a chance for the server state and
the UI's optimistic buffer to desync (see the v0.8.2 patches for
cascade-reset and debounce-leakage bugs this architecture kept
producing). A single atomic save is both simpler to reason about and
more honest about what "the draft" means.

### Removed
- Per-stage PATCH from the builder code path. The
  `PATCH /api/environments/{id}/stages/{order}` backend route still
  exists for external callers, but the frontend `patchStageTemplate`
  helper is gone — unused code.

### Upgraded
- `geny-executor-web` backend: `0.8.3 → 0.8.4`
- `geny-executor-web` frontend: `0.8.3 → 0.8.4`

## v0.8.3 — 2026-04-17

### Fixed — Environment Builder offered Tool / Model / Chain inputs on every stage

Sharing the 4-tab `StageCard` interface across all 16 stages meant the
Builder rendered Config / Tools / Model / Chain tabs everywhere, even
though the runtime only consumes `tool_binding` on `s10_tool`,
`model_override` on `s06_api`, and chains on `s04_guard` / `s14_emit`.
The v0.8.2 fix had the tabs read the library's capability flags, but
the library reported `True` unconditionally — so the tabs still
rendered and just printed "this stage does not support …" banners,
which is the misleading surface the user pushed back on.

`geny-executor v0.13.2` now reports honest capability flags. This
release threads them into the UI:

- **`StageCard` computes `visibleTabs` from the introspection.** Config
  is always shown; Tools is shown only when
  `tool_binding_supported === true`; Model only when
  `model_override_supported === true`; Chain only when
  `strategy_chains` has at least one entry. Result: most stages show
  only Config; `s06_api` shows Config + Model; `s10_tool` shows
  Config + Tools; `s04_guard` / `s14_emit` show Config + Chain.
- **Selected tab stays valid across artifact switches.** When
  switching to an artifact that doesn't support the currently-active
  tab (e.g. picking a non-LLM artifact while on the Model tab), the
  card snaps back to the first visible tab instead of rendering
  against a hidden key.
- **Pre-introspection render is conservative.** Before the catalog
  fetch resolves, only the Config tab appears — no placeholders for
  tabs we don't yet know exist on this artifact.

### Changed
- Minimum `geny-executor` pin bumped to `>=0.13.2`.

### Upgraded
- `geny-executor-web` backend: `0.8.2 → 0.8.3`
- `geny-executor-web` frontend: `0.8.2 → 0.8.3`

## v0.8.2 — 2026-04-17

### Fixed — Environment Builder stage editing was silently broken

The v0.8.0 builder shipped with `frontend/src/types/catalog.ts` field names
that didn't match the library's actual `StageIntrospection.to_dict()`
output. The tabs rendered, but most reads hit `undefined` and fell back to
empty state — the user saw forms with no fields, chains that wouldn't
reorder, and a "this stage does not support tool bindings" banner on every
stage.

- **Library-native field names everywhere.** `types/catalog.ts` now mirrors
  the library dataclasses:
  - `StageIntrospection`: `strategy_chains` (not `chains`),
    `tool_binding_supported` / `model_override_supported`
    (not `supports_*`), `config` (not `current_config`).
  - `SlotIntrospection`: per-impl `impl_schemas` map + `description` /
    `required`; the bogus per-slot `config` / `config_schema` fields are
    gone.
  - `ChainIntrospection`: `current_impls` / `available_impls` (not
    `items` / `available_items`); dropped the never-sent `config_schema`.
  - `ArtifactInfo`: now the library shape — added `version`,
    `stability`, `requires`, `is_default`, `extra`; removed
    `strategies` / `default_strategies` / `order` which the backend
    never populated.
- **Config forms read the right schema.** `ConfigTab` now picks the
  current implementation's schema from `slot.impl_schemas[currentImpl]`
  instead of the non-existent `slot.config_schema`.
- **JSON Schema → flat adapter.** The library emits standard JSON Schema
  (`{type: "object", properties: {...}, required: [...]}`), but
  `ConfigSchemaForm` expects a flat `Record<field, FieldInfo>`. Added
  `utils/jsonSchema.ts` with `flattenJsonSchema` + `defaultsFromJsonSchema`
  so the widget can stay untouched.

### Fixed — Artifact switch left stale data on the manifest

- **Cascade-reset on artifact change.** Previously `handleArtifactChange`
  sent `{artifact: name}` only, so the manifest kept the old artifact's
  `strategies` / `strategy_configs` / `config` / `chain_order`. When the
  old slot names didn't exist on the new artifact, instantiation would
  fail. The Builder now loads the target artifact's introspection first
  and includes fresh defaults in the same PATCH.
- **Strategy impl switch clears the old per-slot config.** Picking a
  different impl used to leave the previous impl's config dict in place,
  which was almost always wrong because schemas differ per impl.
- **Debounced PATCH no longer leaks across stage switches.** The
  unmount-flush now captures the stage order it was buffering for, so a
  fast row-switch no longer PATCHes the new stage with the old stage's
  payload.
- **Chain ordering respects explicit empty arrays.** Setting a chain to
  `[]` is a valid user choice; the tab no longer snaps it back to the
  library's canonical order.

### Changed
- Version label in the header now reads from `src/version.ts`
  (`v0.8.2`) instead of the hardcoded `V0.7.0` left from v0.7 days.

## v0.8.1 — 2026-04-17

### Fixed
- **Environment Builder left pane was empty on a blank environment.** The
  backend's `create_blank` was building its manifest from
  `PipelineSnapshot(pipeline_name=name)` — a snapshot with zero stages —
  so the 16-row `StageList` had nothing to render and the environment's
  name was silently shadowed onto `metadata.base_preset`. Switched to
  `EnvironmentManifest.blank_manifest(...)` (new in
  `geny-executor v0.13.1`), which seeds all 16 stages inactive with
  their default artifact and strategy picks.
- **`fetchPresets` was hitting a non-existent `/api/presets` route.** The
  frontend had two `fetchPresets` functions: the working one in
  `api/pipeline.ts` (`/api/pipeline/presets`) and a duplicate in
  `api/environment.ts` targeting a never-implemented `/api/presets`.
  `CreateEnvironmentModal` and `environmentStore` were importing the
  broken one, so opening the "From preset" tab logged a 404 and the
  dropdown never populated. Removed the duplicate; both callers now use
  the `api/pipeline.ts` implementation.

### Changed
- Bumped `geny-executor` pin to `>=0.13.1`.

## v0.8.0 — 2026-04-17

### Added
- **Environment Builder** — a session-less template editor that turns an
  Environment into a first-class, editable artifact rather than a
  runtime-only snapshot.
  - Left pane: 16-row stage list with category / artifact / off state.
  - Right pane: `StageCard` with 4 tabs (Config / Tools / Model / Chain)
    and an artifact picker; edits are buffered and PATCH'ed with a
    600 ms trailing debounce.
  - Schema-driven config forms (`ConfigSchemaForm`) render any
    `ConfigSchema` — string / integer / number / boolean / enum /
    object / array / any — with a JSON textarea fallback for
    schemaless object / any fields.
  - "New environment" modal: blank manifest or clone-from-preset.
  - "Start session" action instantiates a live session from the
    current template (`POST /api/sessions { env_id }`) and switches
    the UI to the pipeline view.
  - "Edit in Builder" entrypoint added to each saved environment's
    detail pane; "Open Builder" button added to the Environment tab
    header.

### Backend (FastAPI)
- New `/api/catalog` router — session-less catalog built from the
  installed `geny-executor` library:
  - `GET /api/catalog/stages` — 16-row summary.
  - `GET /api/catalog/full` — every stage's full introspection.
  - `GET /api/catalog/stages/{order}` — one stage, default artifact.
  - `GET /api/catalog/stages/{order}/artifacts` — artifact list for a
    stage.
  - `GET /api/catalog/stages/{order}/artifacts/{name}` — one
    (stage, artifact) introspection.
- Environment CRUD extended for template authoring:
  - `POST /api/environments` accepts `mode: "blank" | "from_session"
    | "from_preset"` (mode is inferred from the other fields when
    omitted, keeping the `{session_id, name}` shape compatible).
  - `PUT  /api/environments/{id}/manifest` — wholesale manifest
    replace.
  - `PATCH /api/environments/{id}/stages/{order}` — partial stage
    update (artifact / strategies / configs / tool_binding /
    model_override / chain_order / active).
  - `POST /api/environments/{id}/duplicate` — deep-copy under a new
    name.
  - `GET /api/environments/{id}` now returns a `manifest` field
    alongside the legacy `snapshot`.
- `POST /api/sessions` accepts `env_id` to instantiate a pipeline
  directly from a saved environment (preset is reported as
  `env:<id>` on the session row).
- Service exceptions live in `app/services/exceptions.py` so routers
  can raise them without dragging the whole `geny_executor` import
  chain into the router module.

### Changed
- Minimum `geny-executor` pin bumped to `>=0.13.0` (artifact catalog,
  `introspect_stage`, `Pipeline.from_manifest`, manifest v2).
- Session-create response now always includes the effective
  `preset` label; templated sessions carry `env_id`.

### Upgraded
- `geny-executor-web` backend: `0.7.1 → 0.8.0`
- `geny-executor-web` frontend: `0.7.0 → 0.8.0`

### Compatibility notes
- Existing saved environments remain readable; manifest-less ones fall
  back to the legacy snapshot preview, and the first save through the
  builder migrates them to v2 on disk.
- Old `POST /api/environments { session_id, name }` payloads continue
  to work — the backend infers `mode: "from_session"` when `mode` is
  omitted.
- New `/api/catalog` routes require backend to be running on Python
  3.11+ (the existing `geny-executor` constraint).

---

## v0.7.1 — 2026-04-17

### Changed
- Bumped minimum `geny-executor` to `>=0.12.0` (E1 Stage Uniformity release).
  No source changes required — all imports used by the backend (`PipelinePresets`,
  `PipelineMutator`, `SessionManager`, `PipelineSnapshot`, and the tools subsystem)
  are unchanged in 0.12.0. The pin bump makes the E1 contract (`SlotChain`,
  `StageToolBinding`, per-stage `model_override`, `PresetRegistry`) available for
  the upcoming E2 web stage editor.

### Upgraded
- `geny-executor-web` backend: `0.7.0 → 0.7.1`

---

## v0.7.0 — 2026-04-17

### Removed
- **Harness engine support**: the `geny-harness` (Rust/PyO3) alternative implementation and the
  dual-engine abstraction have been removed. `geny-executor` is now the sole backing library.
  - Deleted `backend/app/services/engine.py` (`EngineType`, `get_engine_modules`).
  - Removed `geny-harness` dependency from `backend/pyproject.toml`.
  - Removed `engine` query parameter from `GET /api/pipeline/describe` and `GET /api/pipeline/presets`.
  - Removed `engine` field from `POST /api/sessions` request body and from session responses.
  - Removed PyO3 `asdict` TypeError fallbacks from `pipeline_service._stage_to_dict` and
    `ws/stream.py` (no longer needed now that all objects are dataclasses).
- **Compare view**: the top-level Python-vs-Rust benchmarking view (`CompareView`, `compareStore`)
  has been removed along with the engine toggle in the header.

### Changed
- Renamed the Environment card "Compare" button to "Diff" (the underlying diff feature is kept —
  only the label changed for clarity). A/B testing between saved environments is unaffected.
- Frontend `ViewMode` is now `"pipeline" | "tools" | "environment" | "history"` (dropped `compare`).
- Backend minimum `geny-executor` version is now `>=0.11.0`.

### Upgraded
- `geny-executor-web` backend: `0.6.0 → 0.7.0`
- `geny-executor-web` frontend: `0.3.0 → 0.7.0`

---

## v0.6.0 and earlier

See git history for changes prior to v0.7.0.
