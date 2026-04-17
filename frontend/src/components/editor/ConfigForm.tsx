/* ConfigForm — renders a form from JSON Schema */
import React from "react";
import ConfigField from "./ConfigField";

interface ConfigFormProps {
  schema: Record<string, unknown>;
  values: Record<string, unknown>;
  onChange: (values: Record<string, unknown>) => void;
  readOnly?: boolean;
}

const ConfigForm: React.FC<ConfigFormProps> = ({
  schema,
  values,
  onChange,
  readOnly = false,
}) => {
  const properties = (schema?.properties ?? {}) as Record<
    string,
    Record<string, unknown>
  >;
  const keys = Object.keys(properties);

  if (keys.length === 0) {
    return (
      <p className="text-xs text-[var(--text-muted)] italic">
        No configurable fields
      </p>
    );
  }

  return (
    <div className="space-y-1">
      {keys.map((key) => (
        <ConfigField
          key={key}
          name={key}
          schema={properties[key]}
          value={values[key]}
          onChange={(v) => onChange({ ...values, [key]: v })}
          readOnly={readOnly}
        />
      ))}
    </div>
  );
};

export default ConfigForm;
