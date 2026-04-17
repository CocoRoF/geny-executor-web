/* ConfigSchemaForm — renders a form from a ConfigSchema (Record<string, ConfigFieldInfo>).
 *
 * The schema comes from /api/catalog and describes a stage's config, a
 * strategy's config, or a model-override block. Values are the currently
 * stored config dict. onChange is called with the full next dict after
 * every edit — the caller writes it straight into the local draft.
 */
import React from "react";

import type {
  ConfigFieldInfo,
  ConfigFieldType,
  ConfigSchema,
} from "../../types/catalog";

interface ConfigSchemaFormProps {
  schema: ConfigSchema;
  values: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
  readOnly?: boolean;
  /** Optional field-path prefix when nested inside an object field. */
  pathPrefix?: string;
}

const ConfigSchemaForm: React.FC<ConfigSchemaFormProps> = ({
  schema,
  values,
  onChange,
  readOnly = false,
  pathPrefix = "",
}) => {
  const entries = Object.entries(schema);
  if (entries.length === 0) {
    return (
      <p className="text-xs italic text-[var(--text-muted)]">
        No config fields.
      </p>
    );
  }

  const handleFieldChange = (name: string, next: unknown) => {
    onChange({ ...values, [name]: next });
  };

  return (
    <div className="space-y-3">
      {entries.map(([name, field]) => (
        <ConfigSchemaField
          key={(pathPrefix ? `${pathPrefix}.` : "") + name}
          name={name}
          field={field}
          value={values[name] ?? field.default}
          onChange={(v) => handleFieldChange(name, v)}
          readOnly={readOnly}
        />
      ))}
    </div>
  );
};

export default ConfigSchemaForm;

// ── Field renderer ──────────────────────────────────────

interface ConfigSchemaFieldProps {
  name: string;
  field: ConfigFieldInfo;
  value: unknown;
  onChange: (next: unknown) => void;
  readOnly?: boolean;
}

const inputBase =
  "w-full bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded px-2 py-1.5 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]";

const ConfigSchemaField: React.FC<ConfigSchemaFieldProps> = ({
  name,
  field,
  value,
  onChange,
  readOnly = false,
}) => {
  const labelText = field.name || name;

  const renderInput = () => {
    // Enum first — highest-priority widget.
    if (field.type === "enum" && field.choices) {
      return (
        <select
          className={inputBase}
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
          disabled={readOnly}
        >
          <option value="" disabled hidden>
            — choose —
          </option>
          {field.choices.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      );
    }

    switch (field.type satisfies ConfigFieldType) {
      case "boolean":
        return (
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              className="w-4 h-4 accent-[var(--accent)]"
              checked={Boolean(value)}
              onChange={(e) => onChange(e.target.checked)}
              disabled={readOnly}
            />
            <span className="text-xs text-[var(--text-secondary)]">
              {labelText}
            </span>
          </label>
        );

      case "integer":
      case "number":
        return (
          <input
            type="number"
            className={inputBase}
            value={value == null ? "" : String(value)}
            min={field.minimum}
            max={field.maximum}
            step={field.type === "integer" ? 1 : "any"}
            onChange={(e) => {
              const raw = e.target.value;
              if (raw === "") {
                onChange(undefined);
                return;
              }
              const parsed =
                field.type === "integer" ? parseInt(raw, 10) : parseFloat(raw);
              onChange(Number.isNaN(parsed) ? undefined : parsed);
            }}
            disabled={readOnly}
          />
        );

      case "array": {
        const arr = Array.isArray(value) ? [...value] : [];
        const itemField: ConfigFieldInfo =
          field.items ?? { name: "item", type: "string" };
        const addItem = () => {
          const defaultItem =
            itemField.default ??
            (itemField.type === "integer" || itemField.type === "number"
              ? 0
              : itemField.type === "boolean"
              ? false
              : "");
          onChange([...arr, defaultItem]);
        };
        return (
          <div className="space-y-1.5">
            {arr.map((item, i) => (
              <div key={i} className="flex items-start gap-1.5">
                <div className="flex-1">
                  <ConfigSchemaField
                    name={`${name}[${i}]`}
                    field={{ ...itemField, name: `${labelText} #${i + 1}` }}
                    value={item}
                    onChange={(v) => {
                      const next = [...arr];
                      next[i] = v;
                      onChange(next);
                    }}
                    readOnly={readOnly}
                  />
                </div>
                {!readOnly && (
                  <button
                    type="button"
                    className="text-red-400 text-xs px-1 mt-1.5"
                    onClick={() =>
                      onChange(arr.filter((_, j) => j !== i))
                    }
                    aria-label={`Remove item ${i + 1}`}
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
            {!readOnly && (
              <button
                type="button"
                className="text-xs text-[var(--accent)] hover:underline"
                onClick={addItem}
              >
                + Add item
              </button>
            )}
          </div>
        );
      }

      case "object": {
        const nested = (value && typeof value === "object" && !Array.isArray(value)
          ? (value as Record<string, unknown>)
          : {});
        if (!field.properties) {
          return (
            <JsonTextarea
              value={nested}
              onChange={onChange}
              readOnly={readOnly}
            />
          );
        }
        return (
          <div className="pl-3 border-l border-[var(--border)] space-y-3">
            <ConfigSchemaForm
              schema={field.properties}
              values={nested}
              onChange={onChange}
              readOnly={readOnly}
              pathPrefix={name}
            />
          </div>
        );
      }

      case "any":
        return (
          <JsonTextarea
            value={value}
            onChange={onChange}
            readOnly={readOnly}
          />
        );

      case "string":
      default:
        return (
          <input
            type="text"
            className={inputBase}
            value={value == null ? "" : String(value)}
            onChange={(e) => onChange(e.target.value)}
            disabled={readOnly}
          />
        );
    }
  };

  const showLabel = field.type !== "boolean";

  return (
    <div>
      {showLabel && (
        <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
          {labelText}
          {field.required && (
            <span className="text-[var(--accent)] ml-1">*</span>
          )}
        </label>
      )}
      {renderInput()}
      {field.description && (
        <p className="text-[11px] text-[var(--text-muted)] mt-0.5 leading-tight">
          {field.description}
        </p>
      )}
    </div>
  );
};

// ── Raw-JSON fallback for "any" / schema-less object fields ─

interface JsonTextareaProps {
  value: unknown;
  onChange: (next: unknown) => void;
  readOnly?: boolean;
}

const JsonTextarea: React.FC<JsonTextareaProps> = ({
  value,
  onChange,
  readOnly,
}) => {
  const [text, setText] = React.useState(() =>
    value === undefined ? "" : JSON.stringify(value, null, 2)
  );
  const [parseError, setParseError] = React.useState<string | null>(null);

  // Re-seed when the backing value changes (e.g. stage switch).
  React.useEffect(() => {
    setText(value === undefined ? "" : JSON.stringify(value, null, 2));
    setParseError(null);
  }, [value]);

  const commit = () => {
    if (text.trim() === "") {
      setParseError(null);
      onChange(undefined);
      return;
    }
    try {
      const parsed = JSON.parse(text);
      setParseError(null);
      onChange(parsed);
    } catch (err) {
      setParseError((err as Error).message);
    }
  };

  return (
    <div>
      <textarea
        className={`${inputBase} font-mono`}
        rows={5}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        disabled={readOnly}
      />
      {parseError && (
        <p className="text-[11px] text-red-400 mt-0.5">{parseError}</p>
      )}
    </div>
  );
};
