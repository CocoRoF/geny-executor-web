/* Types mirroring the session-less /api/catalog responses.
 *
 * The backend returns the geny_executor library's introspection dicts as-is,
 * so these shapes are the library's canonical output. Field names MUST match
 * the library's `StageIntrospection.to_dict()` output; when the two drift the
 * Builder silently renders blank tabs.
 *
 * Two schema shapes live here:
 *   - JsonSchemaObject  — the library's native output (JSON Schema)
 *   - ConfigSchema       — the flat Record<field, FieldInfo> that
 *                          ConfigSchemaForm consumes. Convert with
 *                          `flattenJsonSchema` before rendering.
 */

// ── Flat ConfigSchema (consumed by ConfigSchemaForm) ────

export type ConfigFieldType =
  | "string"
  | "integer"
  | "number"
  | "boolean"
  | "enum"
  | "object"
  | "array"
  | "any";

export interface ConfigFieldInfo {
  name: string;
  type: ConfigFieldType;
  required?: boolean;
  default?: unknown;
  description?: string;
  /** Present when type === "enum". */
  choices?: string[];
  /** Nested object schema. */
  properties?: Record<string, ConfigFieldInfo>;
  /** Element schema when type === "array". */
  items?: ConfigFieldInfo;
  /** Optional numeric bounds (type === "integer" | "number"). */
  minimum?: number;
  maximum?: number;
}

export type ConfigSchema = Record<string, ConfigFieldInfo>;

// ── JSON Schema shape emitted by the library ────────────

/** One property entry inside a JSON Schema `properties` map. */
export interface JsonSchemaField {
  type?: string;
  title?: string;
  description?: string;
  default?: unknown;
  enum?: unknown[];
  enumLabels?: Record<string, string>;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  items?: JsonSchemaField;
  properties?: Record<string, JsonSchemaField>;
  required?: string[];
  "x-ui-widget"?: string;
  [key: string]: unknown;
}

/** Top-level JSON Schema object — library's `config_schema` output. */
export interface JsonSchemaObject {
  type: "object";
  title?: string;
  properties: Record<string, JsonSchemaField>;
  required?: string[];
  [key: string]: unknown;
}

// ── Artifact / introspection shapes (library-native) ────

export interface ArtifactInfo {
  stage: string;
  name: string;
  description: string;
  version: string;
  stability: string;
  requires: string[];
  is_default: boolean;
  provides_stage: boolean;
  extra: Record<string, unknown>;
}

export interface SlotIntrospection {
  slot_name: string;
  description: string;
  required: boolean;
  current_impl: string;
  available_impls: string[];
  /** Map of impl_name → that impl's JSON Schema (or null). */
  impl_schemas: Record<string, JsonSchemaObject | null>;
  impl_descriptions: Record<string, string>;
}

export interface ChainIntrospection {
  chain_name: string;
  description: string;
  current_impls: string[];
  available_impls: string[];
  impl_schemas: Record<string, JsonSchemaObject | null>;
  impl_descriptions: Record<string, string>;
}

export interface StageIntrospection {
  stage: string;
  artifact: string;
  order: number;
  name: string;
  category: string;
  artifact_info: ArtifactInfo;
  config_schema: JsonSchemaObject | null;
  /** Default stage-level config for this artifact. */
  config: Record<string, unknown>;
  strategy_slots: Record<string, SlotIntrospection>;
  strategy_chains: Record<string, ChainIntrospection>;
  tool_binding_supported: boolean;
  model_override_supported: boolean;
  /** True for stages the pipeline can't run without (Input / API / Parse /
   * Yield today). UIs must force `active=true` on these. Added with
   * geny-executor >=0.13.3 — treated as `false` for older backends. */
  required?: boolean;
  extra?: Record<string, unknown>;
}

export interface StageSummary {
  order: number;
  module: string;
  name: string;
  category: string;
  default_artifact: string;
  artifact_count: number;
}

export interface CatalogFullResponse {
  stages: StageIntrospection[];
}

export interface CatalogStageListResponse {
  stages: StageSummary[];
}

export interface CatalogArtifactListResponse {
  stage: string;
  artifacts: ArtifactInfo[];
}
