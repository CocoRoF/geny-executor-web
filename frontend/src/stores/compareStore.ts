import { create } from "zustand";
import type { PipelineEvent } from "../types/events";
import type { PipelineResult, TokenUsage } from "../types/execution";

export interface StageTiming {
  stage: string;
  order: number;
  enterTime: number; // epoch ms
  exitTime: number | null;
  duration: number | null; // ms
  status: "running" | "completed" | "bypassed" | "error";
}

export interface EngineRun {
  engine: "executor" | "harness";
  events: PipelineEvent[];
  stageTimings: Map<string, StageTiming>;
  result: PipelineResult | null;
  status: "idle" | "running" | "complete" | "error";
  startTime: number | null;
  endTime: number | null;
  totalDuration: number | null; // ms
  streamingText: string;
}

const STAGE_ORDER: Record<string, number> = {
  input: 1, context: 2, system: 3, guard: 4, cache: 5,
  api: 6, token: 7, think: 8, parse: 9, tool: 10,
  agent: 11, evaluate: 12, loop: 13, emit: 14, memory: 15, yield: 16,
};

const EMPTY_TOKEN_USAGE: TokenUsage = {
  input_tokens: 0, output_tokens: 0,
  cache_creation_input_tokens: 0, cache_read_input_tokens: 0,
};

function createEmptyRun(engine: "executor" | "harness"): EngineRun {
  return {
    engine,
    events: [],
    stageTimings: new Map(),
    result: null,
    status: "idle",
    startTime: null,
    endTime: null,
    totalDuration: null,
    streamingText: "",
  };
}

interface CompareStore {
  executor: EngineRun;
  harness: EngineRun;
  isComparing: boolean;
  addEvent: (engine: "executor" | "harness", event: PipelineEvent) => void;
  startCompare: () => void;
  reset: () => void;
}

function processEvent(run: EngineRun, event: PipelineEvent): EngineRun {
  const now = event.timestamp ? new Date(event.timestamp).getTime() : Date.now();
  const stageTimings = new Map(run.stageTimings);

  if (event.type === "text.delta") {
    return {
      ...run,
      streamingText: run.streamingText + String(event.data.text ?? ""),
    };
  }

  const events = [...run.events, event];

  if (event.type === "pipeline.start") {
    return { ...run, events, status: "running", startTime: now };
  }

  if (event.type === "stage.enter" && event.stage) {
    stageTimings.set(event.stage, {
      stage: event.stage,
      order: STAGE_ORDER[event.stage] ?? 99,
      enterTime: now,
      exitTime: null,
      duration: null,
      status: "running",
    });
    return { ...run, events, stageTimings };
  }

  if (event.type === "stage.exit" && event.stage) {
    const existing = stageTimings.get(event.stage);
    if (existing) {
      const duration = now - existing.enterTime;
      stageTimings.set(event.stage, {
        ...existing,
        exitTime: now,
        duration,
        status: "completed",
      });
    }
    return { ...run, events, stageTimings };
  }

  if (event.type === "stage.bypass" && event.stage) {
    stageTimings.set(event.stage, {
      stage: event.stage,
      order: STAGE_ORDER[event.stage] ?? 99,
      enterTime: now,
      exitTime: now,
      duration: 0,
      status: "bypassed",
    });
    return { ...run, events, stageTimings };
  }

  if (event.type === "stage.error" && event.stage) {
    const existing = stageTimings.get(event.stage);
    if (existing) {
      stageTimings.set(event.stage, {
        ...existing,
        exitTime: now,
        duration: now - existing.enterTime,
        status: "error",
      });
    }
    return { ...run, events, stageTimings };
  }

  if (event.type === "pipeline.complete") {
    const tokenUsage: TokenUsage = {
      input_tokens: Number(event.data.input_tokens ?? 0),
      output_tokens: Number(event.data.output_tokens ?? 0),
      cache_creation_input_tokens: Number(event.data.cache_creation_input_tokens ?? 0),
      cache_read_input_tokens: Number(event.data.cache_read_input_tokens ?? 0),
    };
    const finalText = run.streamingText || String(event.data.result ?? event.data.text ?? "");
    const result: PipelineResult = {
      success: true,
      text: finalText,
      error: "",
      iterations: Number(event.data.iterations ?? 0),
      total_cost_usd: Number(event.data.total_cost_usd ?? 0),
      model: String(event.data.model ?? ""),
      token_usage: tokenUsage,
    };
    const totalDuration = run.startTime ? now - run.startTime : null;
    return { ...run, events, stageTimings, result, status: "complete", endTime: now, totalDuration };
  }

  if (event.type === "pipeline.error" || event.type === "error") {
    // If pipeline already completed successfully, keep the original result and timing.
    // Post-pipeline errors (e.g. state sync) should not overwrite valid data.
    if (run.status === "complete" && run.result) {
      return {
        ...run,
        events,
        stageTimings,
        status: "error",
        result: { ...run.result, success: false, error: String(event.data.error ?? "Unknown error") },
      };
    }
    const result: PipelineResult = {
      success: false,
      text: "",
      error: String(event.data.error ?? "Unknown error"),
      iterations: 0,
      total_cost_usd: 0,
      model: "",
      token_usage: { ...EMPTY_TOKEN_USAGE },
    };
    const totalDuration = run.startTime ? now - run.startTime : null;
    return { ...run, events, stageTimings, result, status: "error", endTime: now, totalDuration };
  }

  return { ...run, events, stageTimings };
}

export const useCompareStore = create<CompareStore>((set) => ({
  executor: createEmptyRun("executor"),
  harness: createEmptyRun("harness"),
  isComparing: false,

  addEvent: (engine, event) =>
    set((state) => ({
      [engine]: processEvent(state[engine], event),
    })),

  startCompare: () =>
    set({
      executor: { ...createEmptyRun("executor"), status: "running" },
      harness: { ...createEmptyRun("harness"), status: "running" },
      isComparing: true,
    }),

  reset: () =>
    set({
      executor: createEmptyRun("executor"),
      harness: createEmptyRun("harness"),
      isComparing: false,
    }),
}));
