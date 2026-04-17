"""Pipeline creation and metadata service."""

from __future__ import annotations

from dataclasses import asdict

from app.services.engine import get_engine_modules, EngineType


def _stage_to_dict(s) -> dict:
    """Convert a StageDescription to dict, handling both dataclass and PyO3 objects."""
    try:
        return asdict(s)
    except TypeError:
        # PyO3 objects (geny-harness) don't support asdict
        return {
            "name": s.name,
            "order": s.order,
            "category": s.category,
            "is_active": s.is_active,
            "strategies": [
                {
                    "slot_name": si.slot_name,
                    "current_impl": si.current_impl,
                    "available_impls": si.available_impls,
                    "config": si.config,
                }
                for si in (s.strategies or [])
            ],
        }


PRESET_DESCRIPTIONS = {
    "minimal": "Simple Q&A — Input → API → Parse → Yield",
    "chat": "Conversational chatbot with history and memory",
    "agent": "Full autonomous agent with all 16 stages",
    "evaluator": "Quality evaluation pipeline",
    "geny_vtuber": "Geny VTuber system reproduction",
}


class PipelineService:
    """Creates pipelines and exposes metadata."""

    def create_pipeline(
        self,
        preset: str,
        api_key: str,
        *,
        engine: EngineType = "executor",
        system_prompt: str = "",
        model: str = "claude-sonnet-4-20250514",
        max_iterations: int = 50,
    ):
        modules = get_engine_modules(engine)
        Presets = modules["PipelinePresets"]

        match preset:
            case "minimal":
                return Presets.minimal(api_key=api_key, model=model)
            case "chat":
                return Presets.chat(
                    api_key=api_key,
                    model=model,
                    system_prompt=system_prompt or "You are a helpful assistant.",
                )
            case "agent":
                return Presets.agent(
                    api_key=api_key,
                    model=model,
                    system_prompt=system_prompt
                    or "You are an autonomous agent. Complete the task step by step.",
                    max_turns=max_iterations,
                )
            case "evaluator":
                return Presets.evaluator(
                    api_key=api_key,
                    model=model,
                    evaluation_prompt=system_prompt
                    or "Evaluate the following response for quality, accuracy, and completeness.",
                )
            case "geny_vtuber":
                return Presets.geny_vtuber(
                    api_key=api_key,
                    model=model,
                    persona=system_prompt or "You are Geny, a friendly AI VTuber.",
                )
            case _:
                raise ValueError(f"Unknown preset: {preset}")

    def describe_pipeline(
        self, preset: str, *, engine: EngineType = "executor"
    ) -> dict:
        pipeline = self.create_pipeline(preset, api_key="describe-only", engine=engine)
        stages = [_stage_to_dict(s) for s in pipeline.describe()]
        return {"name": preset, "stages": stages}

    def get_presets(self, *, engine: EngineType = "executor") -> list[dict]:
        result = []
        for name, description in PRESET_DESCRIPTIONS.items():
            pipeline = self.create_pipeline(
                name, api_key="describe-only", engine=engine
            )
            active_stages = [s.order for s in pipeline.describe() if s.is_active]
            result.append(
                {
                    "name": name,
                    "description": description,
                    "active_stages": active_stages,
                }
            )
        return result
