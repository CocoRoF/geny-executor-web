"""Pipeline creation and metadata service."""

from __future__ import annotations

from dataclasses import asdict

from geny_executor import Pipeline, PipelinePresets


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
        system_prompt: str = "",
        model: str = "claude-sonnet-4-20250514",
        max_iterations: int = 50,
    ) -> Pipeline:
        match preset:
            case "minimal":
                return PipelinePresets.minimal(api_key=api_key, model=model)
            case "chat":
                return PipelinePresets.chat(
                    api_key=api_key,
                    model=model,
                    system_prompt=system_prompt or "You are a helpful assistant.",
                )
            case "agent":
                return PipelinePresets.agent(
                    api_key=api_key,
                    model=model,
                    system_prompt=system_prompt
                    or "You are an autonomous agent. Complete the task step by step.",
                    max_turns=max_iterations,
                )
            case "evaluator":
                return PipelinePresets.evaluator(
                    api_key=api_key,
                    model=model,
                    evaluation_prompt=system_prompt
                    or "Evaluate the following response for quality, accuracy, and completeness.",
                )
            case "geny_vtuber":
                return PipelinePresets.geny_vtuber(
                    api_key=api_key,
                    model=model,
                    persona=system_prompt or "You are Geny, a friendly AI VTuber.",
                )
            case _:
                raise ValueError(f"Unknown preset: {preset}")

    def describe_pipeline(self, preset: str) -> dict:
        pipeline = self.create_pipeline(preset, api_key="describe-only")
        stages = [asdict(s) for s in pipeline.describe()]
        return {"name": preset, "stages": stages}

    def get_presets(self) -> list[dict]:
        result = []
        for name, description in PRESET_DESCRIPTIONS.items():
            pipeline = self.create_pipeline(name, api_key="describe-only")
            active_stages = [s.order for s in pipeline.describe() if s.is_active]
            result.append(
                {"name": name, "description": description, "active_stages": active_stages}
            )
        return result
