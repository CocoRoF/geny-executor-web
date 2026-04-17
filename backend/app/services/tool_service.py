"""Tool management service — wraps ToolComposer per session."""

from __future__ import annotations

import time
from typing import Any, Dict, List, Optional

from geny_executor.tools.adhoc import AdhocToolDefinition, AdhocToolFactory
from geny_executor.tools.composer import ToolComposer, ToolInfo, ToolPreset
from geny_executor.tools.registry import ToolRegistry
from geny_executor.tools.base import ToolContext, ToolResult
from geny_executor.tools.scope import ToolScope, ToolScopeManager, ToolScopeRule
from geny_executor.tools.sandbox import ToolSandbox, SandboxPolicy


class ToolService:
    """Manages ToolComposer + ToolScopeManager per session."""

    def __init__(self) -> None:
        self._composers: Dict[str, ToolComposer] = {}
        self._scope_managers: Dict[str, ToolScopeManager] = {}

    def get_or_create_composer(self, session) -> ToolComposer:
        if session.id not in self._composers:
            # Build base registry from the pipeline's tool registry if available
            base_registry = getattr(session.pipeline, "_tool_registry", None)
            if base_registry is None:
                base_registry = ToolRegistry()
            self._composers[session.id] = ToolComposer(base_registry)
        return self._composers[session.id]

    def get_or_create_scope_manager(self, session_id: str) -> ToolScopeManager:
        if session_id not in self._scope_managers:
            self._scope_managers[session_id] = ToolScopeManager()
        return self._scope_managers[session_id]

    def list_tools(self, session) -> List[ToolInfo]:
        composer = self.get_or_create_composer(session)
        return composer.list_all_tools()

    def get_tool(self, session, tool_name: str) -> Optional[ToolInfo]:
        for info in self.list_tools(session):
            if info.name == tool_name:
                return info
        return None

    def create_adhoc_tool(self, session, definition_dict: Dict[str, Any]) -> ToolInfo:
        composer = self.get_or_create_composer(session)
        defn = AdhocToolDefinition.from_dict(definition_dict)
        tool = composer.register_adhoc(defn)
        return ToolInfo(
            name=tool.name,
            description=tool.description,
            input_schema=tool.input_schema,
            type="adhoc",
            source="adhoc",
            tags=defn.tags,
            enabled=True,
            definition=defn.to_dict(),
        )

    def remove_adhoc_tool(self, session, tool_name: str) -> bool:
        composer = self.get_or_create_composer(session)
        return composer.unregister_adhoc(tool_name)

    async def test_tool(
        self, session, tool_name: str, input_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        composer = self.get_or_create_composer(session)
        registry = composer.build_registry()
        tool = registry.get(tool_name)
        if tool is None:
            return {
                "success": False,
                "result": "",
                "is_error": True,
                "execution_time_ms": 0,
                "error": f"Tool not found: {tool_name}",
            }

        sandbox = ToolSandbox(SandboxPolicy.standard("/tmp").config)
        ctx = ToolContext(session_id=session.id, working_dir="/tmp")

        start = time.monotonic()
        result = await sandbox.execute_tool(tool, input_data, ctx)
        elapsed = (time.monotonic() - start) * 1000

        return {
            "success": not result.is_error,
            "result": result.content,
            "is_error": result.is_error,
            "execution_time_ms": round(elapsed, 2),
            "error": result.content if result.is_error else None,
        }

    def list_presets(self, session) -> List[ToolPreset]:
        composer = self.get_or_create_composer(session)
        return composer.list_presets()

    def apply_preset(self, session, preset_name: str) -> ToolRegistry:
        composer = self.get_or_create_composer(session)
        return composer.build_registry_from_preset(preset_name)

    def get_scope(self, session_id: str) -> Dict[str, Any]:
        mgr = self.get_or_create_scope_manager(session_id)
        return mgr.describe()

    def update_scope(
        self,
        session_id: str,
        global_scope: Optional[Dict] = None,
        stage_scopes: Optional[Dict[int, Dict]] = None,
    ) -> Dict[str, Any]:
        mgr = self.get_or_create_scope_manager(session_id)
        if global_scope is not None:
            scope = self._dict_to_scope(global_scope)
            mgr.set_global_scope(scope)
        if stage_scopes is not None:
            for order, scope_dict in stage_scopes.items():
                mgr.set_stage_scope(int(order), self._dict_to_scope(scope_dict))
        return mgr.describe()

    def remove(self, session_id: str) -> None:
        self._composers.pop(session_id, None)
        self._scope_managers.pop(session_id, None)

    @staticmethod
    def _dict_to_scope(d: Dict) -> ToolScope:
        rules = []
        for r in d.get("rules", []):
            rules.append(ToolScopeRule(**r))
        return ToolScope(
            include=set(d.get("include", [])) or None,
            exclude=set(d.get("exclude", [])) or None,
            rules=rules or None,
        )
