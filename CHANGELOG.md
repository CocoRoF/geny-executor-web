# Changelog

All notable changes to `geny-executor-web` are documented here.

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
