/* ConfigField — renders a single form field based on JSON Schema property */
import React from "react";

interface FieldSchema {
  type?: string;
  title?: string;
  description?: string;
  default?: unknown;
  enum?: string[];
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  properties?: Record<string, FieldSchema>;
  items?: FieldSchema;
  ui_widget?: string;
}

interface ConfigFieldProps {
  name: string;
  schema: FieldSchema;
  value: unknown;
  onChange: (value: unknown) => void;
  readOnly?: boolean;
}

const ConfigField: React.FC<ConfigFieldProps> = ({
  name,
  schema,
  value,
  onChange,
  readOnly = false,
}) => {
  const label = schema.title || name;
  const widget = schema.ui_widget || schema.type || "string";

  const renderInput = () => {
    // Select / enum
    if (schema.enum) {
      return (
        <select
          className="w-full bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded px-2 py-1.5 text-sm text-[var(--text-primary)]"
          value={String(value ?? schema.default ?? "")}
          onChange={(e) => onChange(e.target.value)}
          disabled={readOnly}
        >
          {schema.enum.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      );
    }

    switch (widget) {
      case "boolean":
        return (
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4 accent-[var(--accent)]"
              checked={!!value}
              onChange={(e) => onChange(e.target.checked)}
              disabled={readOnly}
            />
            <span className="text-sm text-[var(--text-secondary)]">
              {label}
            </span>
          </label>
        );

      case "integer":
      case "number":
        return (
          <input
            type="number"
            className="w-full bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded px-2 py-1.5 text-sm text-[var(--text-primary)]"
            value={value != null ? String(value) : ""}
            min={schema.minimum}
            max={schema.maximum}
            step={widget === "integer" ? 1 : 0.01}
            onChange={(e) => {
              const v =
                widget === "integer"
                  ? parseInt(e.target.value)
                  : parseFloat(e.target.value);
              onChange(isNaN(v) ? undefined : v);
            }}
            disabled={readOnly}
          />
        );

      case "slider":
        return (
          <div className="flex items-center gap-3">
            <input
              type="range"
              className="flex-1 accent-[var(--accent)]"
              value={Number(value ?? schema.minimum ?? 0)}
              min={schema.minimum ?? 0}
              max={schema.maximum ?? 100}
              step={schema.type === "integer" ? 1 : 0.01}
              onChange={(e) => onChange(parseFloat(e.target.value))}
              disabled={readOnly}
            />
            <span className="text-xs text-[var(--text-secondary)] w-12 text-right font-mono">
              {String(value ?? "")}
            </span>
          </div>
        );

      case "textarea":
        return (
          <textarea
            className="w-full bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded px-2 py-1.5 text-sm text-[var(--text-primary)] font-mono"
            rows={4}
            value={String(value ?? "")}
            onChange={(e) => onChange(e.target.value)}
            disabled={readOnly}
          />
        );

      case "array": {
        const arr = Array.isArray(value) ? value : [];
        return (
          <div className="space-y-1">
            {arr.map((item, i) => (
              <div key={i} className="flex items-center gap-1">
                <input
                  className="flex-1 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded px-2 py-1 text-sm text-[var(--text-primary)]"
                  value={String(item)}
                  onChange={(e) => {
                    const next = [...arr];
                    next[i] = e.target.value;
                    onChange(next);
                  }}
                  disabled={readOnly}
                />
                {!readOnly && (
                  <button
                    className="text-red-400 text-xs px-1"
                    onClick={() => onChange(arr.filter((_, j) => j !== i))}
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
            {!readOnly && (
              <button
                className="text-xs text-[var(--accent)] hover:underline"
                onClick={() => onChange([...arr, ""])}
              >
                + Add item
              </button>
            )}
          </div>
        );
      }

      // Default: string input
      default:
        return (
          <input
            type="text"
            className="w-full bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded px-2 py-1.5 text-sm text-[var(--text-primary)]"
            value={String(value ?? "")}
            maxLength={schema.maxLength}
            onChange={(e) => onChange(e.target.value)}
            disabled={readOnly}
          />
        );
    }
  };

  return (
    <div className="mb-3">
      {widget !== "boolean" && (
        <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
          {label}
        </label>
      )}
      {renderInput()}
      {schema.description && (
        <p className="text-xs text-[var(--text-muted)] mt-0.5">
          {schema.description}
        </p>
      )}
    </div>
  );
};

export default ConfigField;
