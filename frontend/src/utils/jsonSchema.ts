/* JSON Schema → flat ConfigSchema adapter.
 *
 * The geny-executor library emits standard JSON Schema from
 * `ConfigSchema.to_json_schema()`:
 *   { type: "object", title, properties: { field: {...} }, required: [...] }
 *
 * The Builder's `ConfigSchemaForm` component predates that and consumes a flat
 * `Record<field, ConfigFieldInfo>`. This helper bridges the two so the widget
 * can stay untouched while the library stays canonical.
 */
import type {
  ConfigFieldInfo,
  ConfigFieldType,
  ConfigSchema,
  JsonSchemaField,
  JsonSchemaObject,
} from "../types/catalog";

function mapType(spec: JsonSchemaField): ConfigFieldType {
  if (Array.isArray(spec.enum) && spec.enum.length > 0) return "enum";
  switch (spec.type) {
    case "integer":
      return "integer";
    case "number":
      return "number";
    case "boolean":
      return "boolean";
    case "array":
      return "array";
    case "object":
      return "object";
    case "string":
      return "string";
    default:
      return "any";
  }
}

function fieldFromSpec(
  fallbackName: string,
  spec: JsonSchemaField | undefined,
  required: boolean,
): ConfigFieldInfo {
  if (!spec) {
    return { name: fallbackName, type: "any", required };
  }
  const type = mapType(spec);
  const out: ConfigFieldInfo = {
    name: typeof spec.title === "string" && spec.title ? spec.title : fallbackName,
    type,
    required,
  };
  if (spec.description) out.description = spec.description;
  if (spec.default !== undefined) out.default = spec.default;
  if (typeof spec.minimum === "number") out.minimum = spec.minimum;
  if (typeof spec.maximum === "number") out.maximum = spec.maximum;
  if (type === "enum" && Array.isArray(spec.enum)) {
    out.choices = spec.enum.map((v) => String(v));
  }
  if (type === "array" && spec.items) {
    out.items = fieldFromSpec("item", spec.items, false);
  }
  if (type === "object" && spec.properties) {
    const subRequired = new Set(spec.required ?? []);
    out.properties = Object.fromEntries(
      Object.entries(spec.properties).map(([k, v]) => [
        k,
        fieldFromSpec(k, v, subRequired.has(k)),
      ]),
    );
  }
  return out;
}

/** Convert a JSON Schema object to the flat ConfigSchema shape.
 *
 * Returns an empty record when the schema is null/undefined/empty — callers can
 * use `Object.keys(result).length === 0` to gate rendering.
 */
export function flattenJsonSchema(
  schema: JsonSchemaObject | null | undefined,
): ConfigSchema {
  if (!schema || !schema.properties) return {};
  const required = new Set(schema.required ?? []);
  const out: ConfigSchema = {};
  for (const [name, spec] of Object.entries(schema.properties)) {
    out[name] = fieldFromSpec(name, spec, required.has(name));
  }
  return out;
}

/** Derive the default value dict for a JSON Schema.
 *
 * Used when a stage's artifact changes — we want to seed the stage's `config`
 * with the new artifact's defaults instead of leaking fields from the previous
 * artifact's schema.
 */
export function defaultsFromJsonSchema(
  schema: JsonSchemaObject | null | undefined,
): Record<string, unknown> {
  if (!schema || !schema.properties) return {};
  const out: Record<string, unknown> = {};
  for (const [name, spec] of Object.entries(schema.properties)) {
    if (spec && spec.default !== undefined) {
      out[name] = spec.default;
    }
  }
  return out;
}
