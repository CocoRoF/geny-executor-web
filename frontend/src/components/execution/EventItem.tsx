import { useState } from "react";
import type { PipelineEvent } from "../../types/events";
import { formatTimestamp } from "../../utils/formatters";

function getTypeColor(type: string): string {
  if (type === "pipeline.complete") return "var(--green)";
  if (type === "pipeline.error" || type === "error") return "var(--red)";
  if (type.startsWith("pipeline")) return "var(--purple)";
  if (type === "stage.enter") return "var(--blue)";
  if (type === "stage.exit") return "var(--green)";
  if (type === "stage.bypass") return "var(--text-muted)";
  if (type === "stage.error") return "var(--red)";
  if (type.startsWith("tool")) return "var(--cyan)";
  return "var(--text-secondary)";
}

export default function EventItem({ event }: { event: PipelineEvent }) {
  const [open, setOpen] = useState(false);
  const hasData = event.data && Object.keys(event.data).length > 0;

  return (
    <div className="event-item">
      <div className="flex items-center gap-2">
        <span className="mono text-[10px] shrink-0" style={{ color: "var(--text-muted)", width: 70 }}>
          {formatTimestamp(event.timestamp)}
        </span>
        <span className="mono text-[11px] font-medium" style={{ color: getTypeColor(event.type) }}>
          {event.type}
        </span>
        {event.stage && (
          <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
            {event.stage}
          </span>
        )}
        {event.iteration > 0 && (
          <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
            #{event.iteration}
          </span>
        )}
        {hasData && (
          <button
            onClick={() => setOpen(!open)}
            className="text-[10px] ml-auto"
            style={{ color: "var(--accent)" }}
          >
            {open ? "−" : "+"}
          </button>
        )}
      </div>
      {open && hasData && (
        <pre
          className="mt-1 ml-[78px] p-2 rounded text-[10px] mono overflow-x-auto max-h-32 overflow-y-auto"
          style={{ background: "var(--bg-primary)", color: "var(--text-secondary)" }}
        >
          {JSON.stringify(event.data, null, 2)}
        </pre>
      )}
    </div>
  );
}
