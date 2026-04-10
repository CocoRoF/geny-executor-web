import { useUIStore } from "../../stores/uiStore";
import type { Engine } from "../../stores/uiStore";

const EXECUTOR_CODE = `from geny_executor import PipelineBuilder

pipeline = (
    PipelineBuilder("my-agent")
    .with_api_key("sk-ant-...")
    .with_model("claude-sonnet-4-20250514")
    .with_system("You are a helpful assistant.")
    .with_context()
    .with_guard()
    .with_cache("system")
    .with_loop(20)
    .with_memory()
    .build()
)

result = await pipeline.run("Hello, tell me about yourself!")

print(result.text)
print(f"Tokens: {result.token_usage.total_tokens}")
print(f"Cost: \${result.total_cost_usd:.4f}")`;

const HARNESS_CODE = `from geny_harness import PipelineConfig, PipelineState, PipelineResult
from geny_harness import TokenUsage, ErrorCategory

# geny-harness provides the same 16-stage architecture,
# powered by Rust (PyO3) for maximum performance.

config = PipelineConfig(
    name="my-agent",
    api_key="sk-ant-...",
)
config.model.model = "claude-sonnet-4-20250514"
config.model.max_tokens = 8192

state = PipelineState()
config.apply_to_state(state)

print(f"Model: {state.model}")
print(f"Max iterations: {state.max_iterations}")
print(f"Thinking enabled: {state.thinking_enabled}")

# ErrorCategory for retry decisions
print(f"RATE_LIMITED recoverable: {ErrorCategory.RATE_LIMITED.is_recoverable}")

# PipelineResult from state
result = PipelineResult.from_state(state)
print(f"Success: {result.success}")`;

export default function CodeViewModal() {
  const engine = useUIStore((s) => s.engine);
  const locale = useUIStore((s) => s.locale);
  const codeViewOpen = useUIStore((s) => s.codeViewOpen);
  const setCodeViewOpen = useUIStore((s) => s.setCodeViewOpen);
  const isKo = locale === "ko";

  if (!codeViewOpen) return null;

  const isExecutor = engine === "executor";
  const code = isExecutor ? EXECUTOR_CODE : HARNESS_CODE;
  const pkgName = isExecutor ? "geny-executor" : "geny-harness";
  const langTag = isExecutor ? "Python" : "Python (Rust-powered)";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
      onClick={() => setCodeViewOpen(false)}
    >
      <div
        className="rounded-lg shadow-2xl overflow-hidden"
        style={{
          background: "var(--bg-secondary)",
          border: "1px solid var(--border)",
          width: "min(680px, 90vw)",
          maxHeight: "80vh",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal header */}
        <div
          className="px-5 py-3 flex items-center justify-between"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <div className="flex items-center gap-3">
            <span
              className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded"
              style={{
                background: isExecutor ? "var(--accent)" : "#e45f2b",
                color: "var(--bg-primary)",
              }}
            >
              {langTag}
            </span>
            <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              {isKo ? `${pkgName} 사용 예시` : `${pkgName} Usage Example`}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="text-[10px] font-mono px-2 py-0.5 rounded"
              style={{
                background: "var(--bg-tertiary)",
                color: "var(--text-muted)",
              }}
            >
              pip install {pkgName}
            </span>
            <button
              onClick={() => setCodeViewOpen(false)}
              className="text-lg leading-none px-2 hover:opacity-70 transition-opacity"
              style={{ color: "var(--text-muted)" }}
            >
              &times;
            </button>
          </div>
        </div>

        {/* Code block */}
        <div className="overflow-auto" style={{ maxHeight: "calc(80vh - 52px)" }}>
          <pre
            className="text-[12px] leading-[1.7] p-5 m-0"
            style={{
              color: "var(--text-secondary)",
              fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
              whiteSpace: "pre",
              overflowX: "auto",
            }}
          >
            <code>{code}</code>
          </pre>
        </div>
      </div>
    </div>
  );
}
