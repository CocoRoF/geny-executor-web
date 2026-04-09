export interface StageMeta {
  order: number;
  name: string;
  displayName: string;
  category: string;
  categoryLabel: string;
  phase: "A" | "B" | "C";
  description: string;
  detailedDescription: string;
  technicalBehavior: string[];
  strategies: StrategySlotMeta[];
  architectureNotes: string;
  canBypass: boolean;
  bypassCondition?: string;
  color: string;
  bgColor: string;
  borderColor: string;
  darkColor: string;
  darkBgColor: string;
  darkBorderColor: string;
  icon: string;
}

export interface StrategySlotMeta {
  slot: string;
  options: { name: string; description: string }[];
}

const STAGE_METADATA: StageMeta[] = [
  /* ═══ PHASE A ═══════════════════════════════════════ */
  {
    order: 1,
    name: "input",
    displayName: "Input",
    category: "ingress",
    categoryLabel: "Ingress",
    phase: "A",
    description: "Validate and normalize user input",
    detailedDescription:
      "The entry point of the entire pipeline. Receives raw user input of any type — text, multimodal content, or structured data — validates it against schema constraints, and normalizes it into a standardized NormalizedInput format. The normalized message is added to the conversation history in Anthropic API format, with session tracking metadata attached.",
    technicalBehavior: [
      "Receives raw input of any type (text, multimodal, structured)",
      "Runs validation against configured validator strategy",
      "Transforms input to NormalizedInput with normalized text",
      "Adds user message to state.messages in Anthropic API format",
      "Attaches session_id to the normalized input",
      "Emits 'input.normalized' event with text length",
    ],
    strategies: [
      {
        slot: "Validator",
        options: [
          { name: "DefaultValidator", description: "Accepts most inputs with basic type checking" },
          { name: "PassthroughValidator", description: "No validation — accept everything" },
          { name: "StrictValidator", description: "Enforces rigid schema constraints" },
          { name: "SchemaValidator", description: "Custom JSON schema validation" },
        ],
      },
      {
        slot: "Normalizer",
        options: [
          { name: "DefaultNormalizer", description: "Text-only normalization" },
          { name: "MultimodalNormalizer", description: "Handles images, audio, and mixed content" },
        ],
      },
    ],
    architectureNotes:
      "Input is the only stage in Phase A. It runs once per pipeline invocation and cannot be bypassed. All downstream stages depend on the NormalizedInput it produces.",
    canBypass: false,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-300",
    darkColor: "dark:text-blue-400",
    darkBgColor: "dark:bg-blue-950",
    darkBorderColor: "dark:border-blue-700",
    icon: "IN",
  },

  /* ═══ PHASE B — Agent Loop ═════════════════════════ */
  {
    order: 2,
    name: "context",
    displayName: "Context",
    category: "ingress",
    categoryLabel: "Ingress",
    phase: "B",
    description: "Load conversation history and memory",
    detailedDescription:
      "Collects and assembles context for the current API call. Loads conversation history already in state, retrieves relevant memory chunks from external stores (vector DB, file system), and monitors context size against budget. When context exceeds 80% of the context window budget, triggers automatic compaction — removing or summarizing older messages to stay within limits.",
    technicalBehavior: [
      "Extracts query from last user message (supports multimodal extraction)",
      "Calls retriever strategy to fetch relevant memory chunks",
      "Deduplicates memory references by key",
      "Estimates token count (4 chars ≈ 1 token heuristic)",
      "Triggers compaction if estimated_tokens > context_window_budget × 0.8",
      "Updates state.memory_refs and state.metadata['memory_context']",
      "Emits 'context.built' and optionally 'context.compacted' events",
    ],
    strategies: [
      {
        slot: "Context Strategy",
        options: [
          { name: "SimpleLoadStrategy", description: "Uses messages already in state — no external retrieval" },
          { name: "HybridStrategy", description: "Keeps last N recent turns + injects relevant memory" },
          { name: "ProgressiveDisclosureStrategy", description: "Start with summaries, expand details on demand" },
        ],
      },
      {
        slot: "Compactor",
        options: [
          { name: "TruncateCompactor", description: "Remove oldest messages when over budget" },
          { name: "SummaryCompactor", description: "Replace old messages with AI-generated summaries" },
          { name: "SlidingWindowCompactor", description: "Maintain a fixed N-message sliding window" },
        ],
      },
      {
        slot: "Retriever",
        options: [
          { name: "NullRetriever", description: "No external memory retrieval" },
          { name: "StaticRetriever", description: "Fixed memory base loaded at initialization" },
        ],
      },
    ],
    architectureNotes:
      "Context is the first stage of every agent loop iteration. It bridges stateful memory management with token budget constraints, ensuring the API call stays within the context window.",
    canBypass: true,
    bypassCondition: "stateless=True (single-turn agents with no history)",
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-300",
    darkColor: "dark:text-blue-400",
    darkBgColor: "dark:bg-blue-950",
    darkBorderColor: "dark:border-blue-700",
    icon: "CTX",
  },
  {
    order: 3,
    name: "system",
    displayName: "System",
    category: "ingress",
    categoryLabel: "Ingress",
    phase: "B",
    description: "Build system prompt with persona and rules",
    detailedDescription:
      "Assembles the system prompt that defines the AI's behavior, constraints, personality, and operational rules. The system prompt can be a simple string or a rich list of content blocks (supporting images, cached sections, and structured instructions). If a tool registry is provided and tools haven't been registered yet, this stage also populates the tool definitions in state.",
    technicalBehavior: [
      "Calls builder strategy to construct system prompt",
      "Supports both string and content block list formats",
      "If tool_registry provided and state.tools empty, registers all tools",
      "System prompt is immutable after this stage — used in all subsequent API calls",
      "Emits 'system.built' event with prompt type, length, and tool count",
    ],
    strategies: [
      {
        slot: "Prompt Builder",
        options: [
          { name: "StaticPromptBuilder", description: "Returns a fixed, preconfigured prompt" },
          { name: "ComposablePromptBuilder", description: "Builds from composable blocks: role, constraints, examples, instructions" },
        ],
      },
    ],
    architectureNotes:
      "The system prompt is foundational — it shapes all downstream AI behavior. Once built, it remains constant across loop iterations, providing consistent behavioral anchoring.",
    canBypass: false,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-300",
    darkColor: "dark:text-blue-400",
    darkBgColor: "dark:bg-blue-950",
    darkBorderColor: "dark:border-blue-700",
    icon: "SYS",
  },
  {
    order: 4,
    name: "guard",
    displayName: "Guard",
    category: "pre_flight",
    categoryLabel: "Pre-Flight",
    phase: "B",
    description: "Safety checks, budget enforcement, permission gates",
    detailedDescription:
      "Pre-flight safety and budget enforcement checkpoint. Runs an ordered chain of Guard validators that can reject execution, emit warnings, or allow continuation. This is the last gate before expensive API calls — checking token budget exhaustion, cost limits, iteration caps, and user permissions. Guards run in fail-fast chain order: the first failure aborts the entire pipeline.",
    technicalBehavior: [
      "Runs GuardChain with all registered guard validators in order",
      "Each guard returns GuardResult(passed, action, message)",
      "Chain stops at first failure (fail-fast pattern)",
      "action='warn': log warning event but continue execution",
      "action='reject': raise GuardRejectError and abort pipeline",
      "Emits 'guard.check' event and optionally 'guard.warn' events",
    ],
    strategies: [
      {
        slot: "Guard Chain",
        options: [
          { name: "TokenBudgetGuard", description: "Fails if remaining tokens < threshold (default 10k)" },
          { name: "CostBudgetGuard", description: "Fails if cumulative cost exceeds USD budget" },
          { name: "IterationGuard", description: "Fails if iteration count >= max_iterations" },
          { name: "PermissionGuard", description: "Fails if user lacks required permissions" },
        ],
      },
    ],
    architectureNotes:
      "Guards provide defense-in-depth before committing tokens and cost. The chain can mix 'warn' (informational) and 'reject' (blocking) actions, allowing progressive alerting before hard stops.",
    canBypass: false,
    color: "text-amber-600",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-300",
    darkColor: "dark:text-amber-400",
    darkBgColor: "dark:bg-amber-950",
    darkBorderColor: "dark:border-amber-700",
    icon: "GRD",
  },
  {
    order: 5,
    name: "cache",
    displayName: "Cache",
    category: "pre_flight",
    categoryLabel: "Pre-Flight",
    phase: "B",
    description: "Optimize prompt caching for cost efficiency",
    detailedDescription:
      "Applies Anthropic's ephemeral prompt caching markers to system prompts and message history. These markers tell the API which parts are 'stable' and can be cached across requests, reducing input token cost by up to 90%. The aggressive strategy can mark system instructions, tool definitions, and the stable prefix of conversation history.",
    technicalBehavior: [
      "Inserts cache_control: {type: 'ephemeral'} metadata on content blocks",
      "System prompt converted to content blocks if using system caching",
      "Aggressive strategy marks: system, tools, last N-4 stable message prefixes",
      "Cache is request-level (ephemeral), not persisted across sessions",
      "Emits 'cache.applied' event with strategy name",
      "Bypasses automatically if NoCacheStrategy is configured",
    ],
    strategies: [
      {
        slot: "Cache Strategy",
        options: [
          { name: "NoCacheStrategy", description: "No caching applied (default for simple pipelines)" },
          { name: "SystemCacheStrategy", description: "Cache system prompt only — minimal optimization" },
          { name: "AggressiveCacheStrategy", description: "Cache system + tools + stable history prefix — maximum savings" },
        ],
      },
    ],
    architectureNotes:
      "Prompt caching is a major cost optimization lever. Cached input tokens cost ~10% of regular tokens. Particularly impactful for long system prompts, large tool registries, and multi-turn conversations.",
    canBypass: true,
    bypassCondition: "NoCacheStrategy configured (no markers to apply)",
    color: "text-amber-600",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-300",
    darkColor: "dark:text-amber-400",
    darkBgColor: "dark:bg-amber-950",
    darkBorderColor: "dark:border-amber-700",
    icon: "CHE",
  },
  {
    order: 6,
    name: "api",
    displayName: "API",
    category: "execution",
    categoryLabel: "Execution",
    phase: "B",
    description: "Call Anthropic Messages API",
    detailedDescription:
      "The core execution stage — calls the Anthropic Messages API with fully assembled messages, system prompt, tool definitions, and thinking configuration. Handles transient errors with configurable retry strategies (exponential backoff, rate-limit awareness). Returns an APIResponse containing content blocks, token usage, stop_reason, and model metadata. This is typically the most expensive stage in terms of token cost.",
    technicalBehavior: [
      "Builds APIRequest from state (model, messages, max_tokens, system, tools, thinking config)",
      "Calls provider strategy (AnthropicProvider for real API, MockProvider for testing)",
      "Retries on transient errors (rate limit, timeout) with exponential backoff",
      "Adds assistant message to state.messages from response content blocks",
      "Stores raw response in state.last_api_response for downstream stages",
      "Tracks token usage: input_tokens, output_tokens, cache_creation/read tokens",
      "Emits 'api.request' (before call) and 'api.response' (after call) events",
    ],
    strategies: [
      {
        slot: "Provider",
        options: [
          { name: "AnthropicProvider", description: "Real API calls to Claude (production)" },
          { name: "MockProvider", description: "Fake deterministic responses (testing)" },
          { name: "RecordingProvider", description: "Records and replays API interactions" },
        ],
      },
      {
        slot: "Retry",
        options: [
          { name: "ExponentialBackoffRetry", description: "Exponential backoff with jitter (default)" },
          { name: "NoRetry", description: "Fail immediately on error" },
          { name: "RateLimitAwareRetry", description: "Special handling for Anthropic rate limits" },
        ],
      },
    ],
    architectureNotes:
      "API stage bridges human intent to AI reasoning. Response content can include: text blocks (the answer), tool_use blocks (function call requests), and thinking blocks (internal reasoning with extended thinking). This is the only stage that calls an external service.",
    canBypass: false,
    color: "text-violet-600",
    bgColor: "bg-violet-50",
    borderColor: "border-violet-300",
    darkColor: "dark:text-violet-400",
    darkBgColor: "dark:bg-violet-950",
    darkBorderColor: "dark:border-violet-700",
    icon: "API",
  },
  {
    order: 7,
    name: "token",
    displayName: "Token",
    category: "execution",
    categoryLabel: "Execution",
    phase: "B",
    description: "Track token usage and calculate costs",
    detailedDescription:
      "Tracks token consumption and calculates real-time USD cost. Pulls usage data from the last API response, accumulates it into the pipeline's running total, and applies model-specific pricing. Also updates cache hit/miss metrics when prompt caching is active, enabling cost optimization visibility.",
    technicalBehavior: [
      "Extracts usage from state.last_api_response (input, output, cache tokens)",
      "Tracker strategy decomposes usage by token type",
      "Calculator strategy computes cost using model-specific pricing rates",
      "Accumulates totals into state.total_cost_usd (running sum)",
      "Updates state.cache_metrics on cache_creation or cache_read tokens",
      "Emits 'token.tracked' event with detailed breakdown",
    ],
    strategies: [
      {
        slot: "Tracker",
        options: [
          { name: "DefaultTracker", description: "Basic token counting (input + output)" },
          { name: "DetailedTracker", description: "Detailed breakdown by content type (text, tool, thinking)" },
        ],
      },
      {
        slot: "Calculator",
        options: [
          { name: "AnthropicPricingCalculator", description: "Uses official Anthropic pricing table" },
          { name: "CustomPricingCalculator", description: "User-defined per-token rates" },
        ],
      },
    ],
    architectureNotes:
      "Cost tracking enables budget-aware execution. The token data feeds into the Guard stage (Stage 4) on subsequent iterations, allowing budget guards to halt execution before overspending.",
    canBypass: false,
    color: "text-violet-600",
    bgColor: "bg-violet-50",
    borderColor: "border-violet-300",
    darkColor: "dark:text-violet-400",
    darkBgColor: "dark:bg-violet-950",
    darkBorderColor: "dark:border-violet-700",
    icon: "TKN",
  },
  {
    order: 8,
    name: "think",
    displayName: "Think",
    category: "execution",
    categoryLabel: "Execution",
    phase: "B",
    description: "Process extended thinking blocks",
    detailedDescription:
      "Processes Claude's extended thinking — the long-form internal reasoning that improves response quality. Separates thinking blocks from response blocks, runs processor strategy on thinking content (extraction, storage, or filtering), and passes non-thinking blocks downstream. Thinking content is internal to the AI and not returned to the user.",
    technicalBehavior: [
      "Bypasses if thinking_enabled=False OR no thinking blocks in response",
      "Extracts all blocks with type='thinking' from API response content",
      "Creates ThinkingBlock objects with text and budget_tokens_used",
      "Calls processor strategy to handle thinking content",
      "Separates response blocks (text, tool_use) from thinking blocks",
      "Sums total_thinking_tokens across all thinking blocks",
      "Emits 'think.processed' event with block count and token usage",
    ],
    strategies: [
      {
        slot: "Thinking Processor",
        options: [
          { name: "PassthroughProcessor", description: "Store thinking content unchanged" },
          { name: "ExtractAndStoreProcessor", description: "Extract key insights from thinking and store them (default)" },
          { name: "ThinkingFilterProcessor", description: "Filter and summarize thinking before storage" },
        ],
      },
    ],
    architectureNotes:
      "Extended thinking is a Claude feature that allows the model to reason deeply before answering. Thinking tokens are separate from output tokens and consume the thinking_budget. This stage makes the internal reasoning auditable and processable.",
    canBypass: true,
    bypassCondition: "thinking_enabled=False or no thinking blocks in API response",
    color: "text-violet-600",
    bgColor: "bg-violet-50",
    borderColor: "border-violet-300",
    darkColor: "dark:text-violet-400",
    darkBgColor: "dark:bg-violet-950",
    darkBorderColor: "dark:border-violet-700",
    icon: "THK",
  },
  {
    order: 9,
    name: "parse",
    displayName: "Parse",
    category: "execution",
    categoryLabel: "Execution",
    phase: "B",
    description: "Parse response and detect completion signals",
    detailedDescription:
      "Extracts structured information from the raw API response. Parses text content, tool calls, and thinking content into a unified ParsedResponse. Also runs signal detection — scanning response text for special patterns that indicate task completion, errors, blocked status, or continuation requests. These signals drive the agent's self-termination logic.",
    technicalBehavior: [
      "Accepts APIResponse from Stage 6 or retrieves from state.last_api_response",
      "Parser strategy extracts: text, tool_calls (id, name, input), thinking_texts",
      "Signal detector scans text for completion patterns: 'complete', 'blocked', 'error', 'continue'",
      "Stores tool calls in state.pending_tool_calls (consumed by Stage 10)",
      "Stores thinking in state.thinking_history (audit trail)",
      "Updates state.final_text with parsed response text",
      "Emits 'parse.complete' event with text length, tool call count, signal detected",
    ],
    strategies: [
      {
        slot: "Response Parser",
        options: [
          { name: "DefaultParser", description: "Standard Anthropic API response parsing" },
          { name: "StructuredOutputParser", description: "For structured output mode (JSON schemas)" },
        ],
      },
      {
        slot: "Signal Detector",
        options: [
          { name: "RegexDetector", description: "Uses regex patterns for fast signal detection (default)" },
          { name: "StructuredDetector", description: "JSON-based signal detection for structured output" },
          { name: "HybridDetector", description: "Combines multiple detection methods" },
        ],
      },
    ],
    architectureNotes:
      "Completion signals enable self-termination: the agent can declare 'I'm done' without tool calls. Example: response text ends with [COMPLETE] → detected as signal → evaluation stage completes the loop.",
    canBypass: false,
    color: "text-violet-600",
    bgColor: "bg-violet-50",
    borderColor: "border-violet-300",
    darkColor: "dark:text-violet-400",
    darkBgColor: "dark:bg-violet-950",
    darkBorderColor: "dark:border-violet-700",
    icon: "PRS",
  },
  {
    order: 10,
    name: "tool",
    displayName: "Tool",
    category: "execution",
    categoryLabel: "Execution",
    phase: "B",
    description: "Execute tool calls (sequential or parallel)",
    detailedDescription:
      "Executes function (tool) calls requested by the AI. Each tool_use block from the API response is dispatched to its registered implementation, executed either sequentially or in parallel, and results are collected and appended to the message history as user-role tool_result messages (per Anthropic API format). After execution, the loop is forced to continue so the AI can process tool results.",
    technicalBehavior: [
      "Bypasses if state.pending_tool_calls is empty (no tools requested)",
      "Router strategy dispatches each call to registered tool implementation",
      "Executor strategy runs tools: SequentialExecutor (one at a time) or ParallelExecutor (concurrent)",
      "Collects results: [{tool_use_id, content, is_error}, ...]",
      "Adds tool results to state.messages as user role message",
      "Forces state.loop_decision = 'continue' (ensures another API call for tool results)",
      "Emits 'tool.execute_start' and 'tool.execute_complete' events per tool",
    ],
    strategies: [
      {
        slot: "Executor",
        options: [
          { name: "SequentialExecutor", description: "Run tools one by one — safer, predictable (default)" },
          { name: "ParallelExecutor", description: "Run tools concurrently — faster for independent calls" },
        ],
      },
      {
        slot: "Router",
        options: [
          { name: "RegistryRouter", description: "Looks up tool implementation in state.tools registry" },
        ],
      },
    ],
    architectureNotes:
      "Tool execution is the mechanism that makes agents agentic. After tools run, loop_decision is forced to 'continue' regardless of evaluation, ensuring the AI sees and processes tool results in the next iteration. This creates the tool-use → API → tool-use cycle.",
    canBypass: true,
    bypassCondition: "No pending tool calls (AI didn't request any tools)",
    color: "text-violet-600",
    bgColor: "bg-violet-50",
    borderColor: "border-violet-300",
    darkColor: "dark:text-violet-400",
    darkBgColor: "dark:bg-violet-950",
    darkBorderColor: "dark:border-violet-700",
    icon: "TL",
  },
  {
    order: 11,
    name: "agent",
    displayName: "Agent",
    category: "execution",
    categoryLabel: "Execution",
    phase: "B",
    description: "Multi-agent orchestration and delegation",
    detailedDescription:
      "Multi-agent orchestration hub. Delegates specialized tasks to sub-pipelines (sub-agents) when the orchestrator strategy determines delegation is appropriate. Each sub-agent is an independent Pipeline instance with its own stages, budgets, and state. Results from sub-agents are collected, summarized, and integrated back into the main conversation, enabling hierarchical task decomposition.",
    technicalBehavior: [
      "Bypasses if SingleAgentOrchestrator AND no state.delegate_requests",
      "Orchestrator decides delegation based on state.delegate_requests",
      "Each delegation spawns a separate Pipeline instance (sub-agent)",
      "Sub-agents run independently with their own configuration and budget",
      "Collects sub-results and stores in state.agent_results",
      "If sub-results exist: adds summary to state.messages, forces loop_decision = 'continue'",
      "Emits 'agent.orchestrate_start' and 'agent.orchestrate_complete' events",
    ],
    strategies: [
      {
        slot: "Orchestrator",
        options: [
          { name: "SingleAgentOrchestrator", description: "No delegation — pass-through (default)" },
          { name: "DelegateOrchestrator", description: "Delegate to specialized sub-agents" },
          { name: "EvaluatorOrchestrator", description: "Delegate to evaluator agents for quality checks" },
        ],
      },
    ],
    architectureNotes:
      "Sub-agents are fully isolated Pipeline instances. This enables divide-and-conquer architectures where a manager agent decomposes a complex task and delegates parts to expert agents. Each sub-agent can use a different preset and model.",
    canBypass: true,
    bypassCondition: "SingleAgentOrchestrator mode with no delegation requests",
    color: "text-violet-600",
    bgColor: "bg-violet-50",
    borderColor: "border-violet-300",
    darkColor: "dark:text-violet-400",
    darkBgColor: "dark:bg-violet-950",
    darkBorderColor: "dark:border-violet-700",
    icon: "AGT",
  },
  {
    order: 12,
    name: "evaluate",
    displayName: "Evaluate",
    category: "decision",
    categoryLabel: "Decision",
    phase: "B",
    description: "Judge response quality and completeness",
    detailedDescription:
      "Critical decision point that evaluates whether the current response is 'good enough' to complete, or if the loop should continue, retry, or escalate. Combines strategy-based evaluation (signal detection, criteria matching, or secondary agent judgment) with optional quality scoring (0.0–1.0). The evaluation decision maps directly to the loop decision that determines pipeline control flow.",
    technicalBehavior: [
      "Runs evaluation strategy: analyzes state and returns EvaluationResult",
      "Optionally runs quality scorer for numerical score (0.0–1.0)",
      "Maps evaluation decision to loop_decision: complete, continue, retry, escalate, error",
      "Stores score in state.evaluation_score, feedback in state.evaluation_feedback",
      "Evaluation decision can override tool-use continuation",
      "Emits 'evaluate.complete' event with score, decision, and feedback",
    ],
    strategies: [
      {
        slot: "Evaluation Strategy",
        options: [
          { name: "SignalBasedEvaluation", description: "Uses completion_signal from Parse stage (default)" },
          { name: "CriteriaBasedEvaluation", description: "Checks custom criteria: word count, format, content rules" },
          { name: "AgentEvaluation", description: "Calls a secondary agent to evaluate response quality" },
        ],
      },
      {
        slot: "Scorer",
        options: [
          { name: "NoScorer", description: "No numerical quality scoring (default)" },
          { name: "WeightedScorer", description: "Multi-criteria scoring: relevance, completeness, format" },
        ],
      },
    ],
    architectureNotes:
      "Evaluation can override tool-use continuation — even with pending tools, evaluation can force completion or escalation. This prevents infinite loops and enables policy-driven early exits.",
    canBypass: false,
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-300",
    darkColor: "dark:text-emerald-400",
    darkBgColor: "dark:bg-emerald-950",
    darkBorderColor: "dark:border-emerald-700",
    icon: "EVL",
  },
  {
    order: 13,
    name: "loop",
    displayName: "Loop",
    category: "decision",
    categoryLabel: "Decision",
    phase: "B",
    description: "Decide whether to continue or finish the loop",
    detailedDescription:
      "Final loop control decision — the fork point of the pipeline. Respects terminal upstream decisions from Evaluate (complete, error, escalate) but applies its own controller strategy when upstream says 'continue'. The controller checks: are there pending tool results? was a completion signal detected? has the max iteration count been reached? is the budget nearly exhausted? Sets the final loop_decision that determines whether execution returns to Stage 2 or exits to Phase C.",
    technicalBehavior: [
      "Respects upstream loop_decision from Evaluate stage",
      "Terminal decisions (complete, error, escalate) pass through unchanged",
      "For 'continue' decisions: calls controller strategy for final verdict",
      "Controller checks: tool_results pending, completion signals, max iterations, budget",
      "Sets final state.loop_decision",
      "Clears state.tool_results (consumed for this iteration)",
      "Emits event: 'loop.{decision}' (e.g., 'loop.complete', 'loop.continue')",
    ],
    strategies: [
      {
        slot: "Loop Controller",
        options: [
          { name: "StandardLoopController", description: "Tool results → continue, signals decide, end_turn → complete" },
          { name: "SingleTurnController", description: "Always complete immediately — no loop (single-turn mode)" },
          { name: "BudgetAwareLoopController", description: "Stops if cost/token budget ratio exceeds threshold" },
        ],
      },
    ],
    architectureNotes:
      "If loop_decision == 'continue': increment state.iteration and jump back to Stage 2 (Context). Otherwise: break out of Phase B and proceed to Phase C (Finalize). This is the only stage that controls the loop boundary.",
    canBypass: false,
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-300",
    darkColor: "dark:text-emerald-400",
    darkBgColor: "dark:bg-emerald-950",
    darkBorderColor: "dark:border-emerald-700",
    icon: "LP",
  },

  /* ═══ PHASE C — Finalize ══════════════════════════= */
  {
    order: 14,
    name: "emit",
    displayName: "Emit",
    category: "egress",
    categoryLabel: "Egress",
    phase: "C",
    description: "Output results (text, callback, VTuber, TTS)",
    detailedDescription:
      "Delivers the final response to external consumers through multiple output channels simultaneously. The emitter chain fans out the result to registered destinations: text buffer for API responses, webhooks for callbacks, VTuber animation systems, TTS (text-to-speech) engines, and more. Emitters can fail independently without blocking others.",
    technicalBehavior: [
      "Bypasses if no emitters are registered in the chain",
      "Calls each emitter in the configured chain",
      "Each emitter customizes delivery: format, channel, filtering",
      "Collects results from all emitters",
      "Emitters can fail independently without blocking others (configurable)",
      "Emits 'emit.start' and 'emit.complete' events",
    ],
    strategies: [
      {
        slot: "Emitter Chain",
        options: [
          { name: "TextEmitter", description: "Output to text buffer / API response" },
          { name: "CallbackEmitter", description: "Call webhook or callback function" },
          { name: "VTuberEmitter", description: "Output to VTuber animation system (Live2D/AIRI)" },
          { name: "TTSEmitter", description: "Output to text-to-speech engine" },
        ],
      },
    ],
    architectureNotes:
      "Emitters run conceptually in parallel — response fans out to multiple consumers. This enables multi-channel scenarios: chat UI + voice synthesis + logging, all from the same pipeline result.",
    canBypass: true,
    bypassCondition: "No emitters registered in the chain",
    color: "text-rose-600",
    bgColor: "bg-rose-50",
    borderColor: "border-rose-300",
    darkColor: "dark:text-rose-400",
    darkBgColor: "dark:bg-rose-950",
    darkBorderColor: "dark:border-rose-700",
    icon: "EMT",
  },
  {
    order: 15,
    name: "memory",
    displayName: "Memory",
    category: "egress",
    categoryLabel: "Egress",
    phase: "C",
    description: "Persist conversation memory",
    detailedDescription:
      "Persists conversation history and updates long-term memory stores. Applies the memory update strategy — determining what to save (everything, nothing, summaries) — and calls the persistence backend to write it (file, database, vector store). Essential for stateful agents that learn and remember across conversations.",
    technicalBehavior: [
      "Bypasses if stateless=True OR NoMemoryStrategy configured",
      "Calls memory update strategy to transform state.messages for storage",
      "If persistence configured and session_id present: calls persistence.save()",
      "Persistence writes to configured backend (RAM, file, database)",
      "Emits 'memory.updated' and optionally 'memory.persisted' events",
    ],
    strategies: [
      {
        slot: "Update Strategy",
        options: [
          { name: "AppendOnlyStrategy", description: "Save all messages as-is (default)" },
          { name: "NoMemoryStrategy", description: "Don't save anything — ephemeral execution" },
          { name: "ReflectiveStrategy", description: "Summarize and reflect on conversation before saving" },
        ],
      },
      {
        slot: "Persistence",
        options: [
          { name: "InMemoryPersistence", description: "Store in RAM — session-scoped, lost on restart" },
          { name: "FilePersistence", description: "Store on disk — survives restarts" },
        ],
      },
    ],
    architectureNotes:
      "Memory separates 'what to save' (strategy) from 'where to save' (persistence). This decoupling allows the same conversation data to be stored in files, vector databases, or discarded entirely, depending on configuration.",
    canBypass: true,
    bypassCondition: "stateless=True or NoMemoryStrategy configured",
    color: "text-rose-600",
    bgColor: "bg-rose-50",
    borderColor: "border-rose-300",
    darkColor: "dark:text-rose-400",
    darkBgColor: "dark:bg-rose-950",
    darkBorderColor: "dark:border-rose-700",
    icon: "MEM",
  },
  {
    order: 16,
    name: "yield",
    displayName: "Yield",
    category: "egress",
    categoryLabel: "Egress",
    phase: "C",
    description: "Format and return final result",
    detailedDescription:
      "The terminal stage. Transforms the pipeline's accumulated state into the caller's expected output format: plain text, structured JSON with metadata, or a streaming iterator. Returns a PipelineResult containing the response text, total cost, iteration count, and any metadata. After this stage, pipeline execution is complete.",
    technicalBehavior: [
      "Calls formatter strategy to transform state into output format",
      "Formatter customizes: structure, metadata inclusion, serialization",
      "Returns state.final_output if set, otherwise state.final_text",
      "Emits 'yield.complete' event with text length, iteration count, total cost",
      "Pipeline execution ends here — result returned to caller",
    ],
    strategies: [
      {
        slot: "Formatter",
        options: [
          { name: "DefaultFormatter", description: "Returns plain text response" },
          { name: "StructuredFormatter", description: "Returns JSON with metadata: cost, iterations, events" },
          { name: "StreamingFormatter", description: "Returns streaming iterator for real-time output" },
        ],
      },
    ],
    architectureNotes:
      "Final stage decouples pipeline logic from output format. The same pipeline can serve REST API, streaming WebSocket, batch job, or CLI — each needing different output shape — by swapping the formatter strategy.",
    canBypass: false,
    color: "text-rose-600",
    bgColor: "bg-rose-50",
    borderColor: "border-rose-300",
    darkColor: "dark:text-rose-400",
    darkBgColor: "dark:bg-rose-950",
    darkBorderColor: "dark:border-rose-700",
    icon: "YLD",
  },
];

import type { Locale } from "../stores/uiStore";
import { STAGES_KO } from "../locales/ko";

export function getStageMeta(order: number): StageMeta | undefined {
  return STAGE_METADATA.find((s) => s.order === order);
}

/** Return StageMeta with text fields replaced by Korean when locale="ko" */
export function getLocalizedStageMeta(
  order: number,
  locale: Locale,
): StageMeta | undefined {
  const base = STAGE_METADATA.find((s) => s.order === order);
  if (!base || locale === "en") return base;
  const ko = STAGES_KO[order];
  if (!ko) return base;
  return {
    ...base,
    displayName: ko.displayName,
    categoryLabel: ko.categoryLabel,
    description: ko.description,
    detailedDescription: ko.detailedDescription,
    technicalBehavior: ko.technicalBehavior,
    strategies: ko.strategies,
    architectureNotes: ko.architectureNotes,
    bypassCondition: ko.bypassCondition ?? base.bypassCondition,
  };
}

export function getStageMetaByName(name: string): StageMeta | undefined {
  return STAGE_METADATA.find((s) => s.name === name);
}

export function getAllStagesMeta(): StageMeta[] {
  return STAGE_METADATA;
}

export function getCategoryColor(category: string): {
  accent: string;
  bg: string;
  border: string;
} {
  const map: Record<string, { accent: string; bg: string; border: string }> = {
    ingress: { accent: "var(--blue)", bg: "rgba(91,140,212,0.08)", border: "rgba(91,140,212,0.25)" },
    pre_flight: { accent: "var(--accent)", bg: "var(--accent-dim)", border: "var(--accent-glow)" },
    execution: { accent: "var(--purple)", bg: "rgba(155,123,212,0.08)", border: "rgba(155,123,212,0.25)" },
    decision: { accent: "var(--green)", bg: "rgba(91,186,111,0.08)", border: "rgba(91,186,111,0.25)" },
    egress: { accent: "var(--red)", bg: "rgba(212,91,91,0.08)", border: "rgba(212,91,91,0.25)" },
  };
  return map[category] ?? { accent: "var(--text-secondary)", bg: "var(--bg-tertiary)", border: "var(--border)" };
}
