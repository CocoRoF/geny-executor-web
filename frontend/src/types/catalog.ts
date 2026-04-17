/* Types mirroring the session-less /api/catalog responses.
 *
 * These describe the stage × artifact universe that the Environment Builder
 * renders — pre-any-session metadata pulled straight from the installed
 * geny-executor library.
 */

// ── Schema primitives shared with ConfigSchemaForm ──────

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

// ── Catalog shapes ─────────────────────────────────────

export interface ArtifactInfo {
  name: string;
  description: string;
  provides_stage: boolean;
  strategies: string[];
  default_strategies: Record<string, string>;
  stage: string;
  order: number;
}

export interface SlotIntrospection {
  slot_name: string;
  current_impl: string;
  available_impls: string[];
  config: Record<string, unknown>;
  config_schema: ConfigSchema;
  impl_descriptions: Record<string, string>;
}

export interface ChainIntrospection {
  chain_name: string;
  items: string[];
  available_items: string[];
  config_schema: ConfigSchema;
}

export interface StageIntrospection {
  stage: string;
  order: number;
  name: string;
  category: string;
  artifact: string;
  artifact_info: ArtifactInfo;
  is_active: boolean;
  config_schema: ConfigSchema;
  current_config: Record<string, unknown>;
  strategy_slots: Record<string, SlotIntrospection>;
  chains: Record<string, ChainIntrospection>;
  supports_tool_binding: boolean;
  supports_model_override: boolean;
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
