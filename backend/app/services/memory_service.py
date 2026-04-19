"""Memory session registry.

Bridges executor v0.20.0's `MemoryProviderFactory` into the web's
session lifecycle. The executor's `SessionManager` has no memory
hook of its own (memory wires in at *stage* construction, not at the
session layer), so the web maintains a parallel `session_id →
MemoryProvider` map and is responsible for:

  1. Building a provider on session create (via the factory).
  2. Attaching the provider to memory-aware stages on the session's
     pipeline — currently only Stage 2 (`ContextStage.provider`).
  3. Disposing the provider on session delete.
  4. Exposing a handle for REST layers that need to read descriptors
     or run retrieval/writes.

All factory failures are re-raised as :class:`MemoryConfigError` so
routers can return a clean 400.
"""

from __future__ import annotations

import asyncio
import inspect
from typing import Any, Dict, Mapping, Optional

from geny_executor.memory.factory import MemoryProviderFactory
from geny_executor.memory.provider import MemoryProvider

from app.services.exceptions import MemoryConfigError, MemorySessionNotFoundError


class MemorySessionRegistry:
    """Per-session `MemoryProvider` manager.

    One instance lives on ``app.state.memory_service``. ``default_config``
    is the factory config dict used when a session is created without a
    per-request override. Pass ``None`` to disable memory wiring (no
    provider is constructed and stages are left untouched).
    """

    def __init__(
        self,
        *,
        factory: Optional[MemoryProviderFactory] = None,
        default_config: Optional[Mapping[str, Any]] = None,
    ) -> None:
        self._factory = factory or MemoryProviderFactory()
        self._default_config: Optional[Dict[str, Any]] = (
            dict(default_config) if default_config else None
        )
        self._providers: Dict[str, MemoryProvider] = {}
        self._configs: Dict[str, Dict[str, Any]] = {}

    # ── lifecycle ───────────────────────────────────────────────────

    def provision(
        self,
        session_id: str,
        *,
        override: Optional[Mapping[str, Any]] = None,
    ) -> Optional[MemoryProvider]:
        """Construct and register a provider for a session.

        Returns ``None`` when memory is globally disabled (no default
        config *and* no override). Raises :class:`MemoryConfigError`
        when the provided config is rejected by the factory.
        """
        if not session_id:
            raise ValueError("session_id must be a non-empty string")

        config = self._resolve_config(override)
        if config is None:
            return None

        config = dict(config)
        config.setdefault("session_id", session_id)
        try:
            provider = self._factory.build(config)
        except Exception as exc:  # noqa: BLE001 — all factory errors surface as config errors
            raise MemoryConfigError(str(exc)) from exc

        self._providers[session_id] = provider
        self._configs[session_id] = config
        return provider

    def get(self, session_id: str) -> Optional[MemoryProvider]:
        return self._providers.get(session_id)

    def require(self, session_id: str) -> MemoryProvider:
        provider = self._providers.get(session_id)
        if provider is None:
            raise MemorySessionNotFoundError(session_id)
        return provider

    def get_config(self, session_id: str) -> Optional[Dict[str, Any]]:
        cfg = self._configs.get(session_id)
        return dict(cfg) if cfg is not None else None

    def release(self, session_id: str) -> bool:
        """Drop the provider. Returns True if one was registered.

        Providers' ``close()`` is typically async; we schedule it on
        the running event loop when one is active, otherwise run it
        to completion synchronously. Sync ``close()`` implementations
        are tolerated for symmetry.
        """
        provider = self._providers.pop(session_id, None)
        self._configs.pop(session_id, None)
        if provider is None:
            return False
        close = getattr(provider, "close", None)
        if not callable(close):
            return True
        try:
            result = close()
            if inspect.iscoroutine(result):
                try:
                    loop = asyncio.get_running_loop()
                except RuntimeError:
                    loop = None
                if loop is not None:
                    loop.create_task(result)
                else:
                    asyncio.run(result)
        except Exception:  # noqa: BLE001 — best-effort teardown
            pass
        return True

    # ── pipeline wiring ─────────────────────────────────────────────

    def attach_to_pipeline(self, pipeline: Any, provider: MemoryProvider) -> None:
        """Wire the provider into memory-aware stages of a pipeline.

        Today that is only Stage 2 (Context). Future stages that grow
        a `provider` attribute can be added here without touching the
        session router.
        """
        stage = pipeline.get_stage(2)
        if stage is not None and hasattr(stage, "provider"):
            stage.provider = provider

    # ── introspection ───────────────────────────────────────────────

    def describe(self, session_id: str) -> Dict[str, Any]:
        """Return a JSON-serialisable description of the session's
        provider, suitable for REST ``GET /memory`` responses.

        Shape mirrors :class:`geny_executor.memory.provider.MemoryDescriptor`
        after enum-stringification and ``location`` redaction (DSNs can
        contain credentials).
        """
        provider = self.require(session_id)
        desc = provider.descriptor
        return {
            "session_id": session_id,
            "provider": desc.name,
            "version": desc.version,
            "scope": desc.scope.value,
            "layers": sorted(layer.value for layer in desc.layers),
            "capabilities": sorted(cap.value for cap in desc.capabilities),
            "backends": [
                {
                    "layer": b.layer.value,
                    "backend": b.backend,
                }
                for b in desc.backends
            ],
            "metadata": dict(desc.metadata),
            "config": self.get_config(session_id),
        }

    def default_config(self) -> Optional[Dict[str, Any]]:
        return dict(self._default_config) if self._default_config else None

    # ── internals ───────────────────────────────────────────────────

    def _resolve_config(
        self, override: Optional[Mapping[str, Any]]
    ) -> Optional[Dict[str, Any]]:
        if override is not None:
            if not isinstance(override, Mapping):
                raise MemoryConfigError("memory_config must be a mapping")
            cfg = dict(override)
            if "provider" not in cfg or not cfg["provider"]:
                raise MemoryConfigError(
                    "memory_config must include a non-empty 'provider'"
                )
            return cfg
        if self._default_config is None:
            return None
        return dict(self._default_config)
