import { useRef, useEffect } from "react";
import { useExecutionStore } from "../../stores/executionStore";
import EventItem from "./EventItem";

export default function EventLog() {
  const events = useExecutionStore((s) => s.events);
  const isExecuting = useExecutionStore((s) => s.isExecuting);
  const activeStage = useExecutionStore((s) => s.activeStage);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [events.length]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className="px-4 py-3 flex items-center justify-between shrink-0"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <span
          className="text-[10px] uppercase tracking-widest font-semibold"
          style={{ color: "var(--text-muted)" }}
        >
          Event Log
        </span>
        {isExecuting && (
          <div className="flex items-center gap-2">
            <div
              className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ background: "var(--accent)" }}
            />
            <span className="text-[11px]" style={{ color: "var(--accent)" }}>
              {activeStage ?? "processing"}
            </span>
          </div>
        )}
        {!isExecuting && events.length > 0 && (
          <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
            {events.length} events
          </span>
        )}
      </div>

      {/* Events */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {events.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="text-3xl mb-3" style={{ color: "var(--text-muted)", opacity: 0.3 }}>
                &#9654;
              </div>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                Events will stream here
                <br />
                during pipeline execution
              </p>
            </div>
          </div>
        ) : (
          <>
            {events.map((event, i) => (
              <EventItem key={i} event={event} />
            ))}
            <div ref={bottomRef} />
          </>
        )}
      </div>
    </div>
  );
}
