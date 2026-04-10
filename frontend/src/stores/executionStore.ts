import { create } from "zustand";
import type { PipelineEvent } from "../types/events";
import type { PipelineResult, TokenUsage } from "../types/execution";

interface ExecutionStore {
  events: PipelineEvent[];
  activeStage: string | null;
  completedStages: Set<string>;
  errorStages: Set<string>;
  isExecuting: boolean;
  result: PipelineResult | null;
  runningCostUsd: number;
  streamingText: string;
  isStreaming: boolean;
  addEvent: (event: PipelineEvent) => void;
  setExecuting: (v: boolean) => void;
  reset: () => void;
}

const EMPTY_TOKEN_USAGE: TokenUsage = {
  input_tokens: 0,
  output_tokens: 0,
  cache_creation_input_tokens: 0,
  cache_read_input_tokens: 0,
};

export const useExecutionStore = create<ExecutionStore>((set) => ({
  events: [],
  activeStage: null,
  completedStages: new Set(),
  errorStages: new Set(),
  isExecuting: false,
  result: null,
  runningCostUsd: 0,
  streamingText: "",
  isStreaming: false,

  addEvent: (event) =>
    set((state) => {
      let activeStage = state.activeStage;
      const completedStages = new Set(state.completedStages);
      const errorStages = new Set(state.errorStages);
      let result = state.result;
      let isExecuting = state.isExecuting;
      let runningCostUsd = state.runningCostUsd;
      let streamingText = state.streamingText;
      let isStreaming = state.isStreaming;

      // text.delta events are high-frequency — don't add to event log
      if (event.type === "text.delta") {
        streamingText += String(event.data.text ?? "");
        isStreaming = true;
        return { streamingText, isStreaming };
      }

      const events = [...state.events, event];

      if (event.type === "stage.enter") {
        activeStage = event.stage;
        // API stage starting = streaming may begin
        if (event.stage === "api") {
          streamingText = "";
          isStreaming = false;
        }
      } else if (event.type === "stage.exit") {
        completedStages.add(event.stage);
        activeStage = null;
        // API stage done = streaming complete
        if (event.stage === "api") {
          isStreaming = false;
        }
      } else if (event.type === "stage.error") {
        errorStages.add(event.stage);
        activeStage = null;
        isStreaming = false;
      } else if (event.type === "stage.bypass") {
        completedStages.add(event.stage);
      } else if (event.type === "token.tracked") {
        runningCostUsd = Number(event.data.total_cost_usd ?? runningCostUsd);
      } else if (event.type === "pipeline.complete") {
        activeStage = null;
        isExecuting = false;
        isStreaming = false;
        const tokenUsage: TokenUsage = {
          input_tokens: Number(event.data.input_tokens ?? 0),
          output_tokens: Number(event.data.output_tokens ?? 0),
          cache_creation_input_tokens: Number(event.data.cache_creation_input_tokens ?? 0),
          cache_read_input_tokens: Number(event.data.cache_read_input_tokens ?? 0),
        };
        // Use streaming text if available, fall back to event result
        const finalText = streamingText || String(event.data.result ?? "");
        result = {
          success: true,
          text: finalText,
          error: "",
          iterations: Number(event.data.iterations ?? 0),
          total_cost_usd: Number(event.data.total_cost_usd ?? runningCostUsd),
          model: String(event.data.model ?? ""),
          token_usage: tokenUsage,
        };
        runningCostUsd = result.total_cost_usd;
      } else if (event.type === "pipeline.error" || event.type === "error") {
        activeStage = null;
        isExecuting = false;
        isStreaming = false;
        result = {
          success: false,
          text: "",
          error: String(event.data.error ?? "Unknown error"),
          iterations: 0,
          total_cost_usd: runningCostUsd,
          model: "",
          token_usage: { ...EMPTY_TOKEN_USAGE },
        };
      }

      return {
        events,
        activeStage,
        completedStages,
        errorStages,
        result,
        isExecuting,
        runningCostUsd,
        streamingText,
        isStreaming,
      };
    }),

  setExecuting: (v) => set({ isExecuting: v }),

  reset: () =>
    set({
      events: [],
      activeStage: null,
      completedStages: new Set(),
      errorStages: new Set(),
      isExecuting: false,
      result: null,
      runningCostUsd: 0,
      streamingText: "",
      isStreaming: false,
    }),
}));
