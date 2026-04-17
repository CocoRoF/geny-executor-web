# Changelog

All notable changes to `geny-executor-web` are documented here.

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
