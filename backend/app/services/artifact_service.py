"""ArtifactService — session-less catalog of stages and artifacts.

Backs the ``/api/catalog`` endpoints consumed by the Environment Builder UI.
All data exposed here is derived purely from importable stage modules, so
it is safe to call without an active pipeline session.
"""

from __future__ import annotations

from functools import lru_cache
from typing import Dict, List

from geny_executor import (
    ArtifactInfo,
    IntrospectionUnsupported,
    StageIntrospection,
    describe_artifact,
    introspect_all,
    introspect_stage,
    list_artifacts,
    list_artifacts_with_meta,
)
from geny_executor.core.artifact import STAGE_MODULES


class ArtifactError(ValueError):
    """Raised when a catalog lookup references an unknown stage or artifact."""


class ArtifactService:
    """Expose the installed stage / artifact surface for UI consumption.

    The full catalog and default introspection pass are cached for the
    lifetime of the process. Artifacts added after boot will not be
    visible until restart; this matches the existing plugin contract and
    keeps response latency predictable.
    """

    def list_for_stage(self, order: int) -> List[ArtifactInfo]:
        """Return every artifact registered for *order* (1–16)."""
        module = self._module_for_order(order)
        return list_artifacts_with_meta(module)

    def describe_artifact_full(self, order: int, artifact: str) -> StageIntrospection:
        """Return full slot/chain/schema introspection for one artifact."""
        module = self._module_for_order(order)
        if artifact not in list_artifacts(module):
            raise ArtifactError(f"Unknown artifact '{artifact}' for stage {order}")
        try:
            return introspect_stage(module, artifact)
        except IntrospectionUnsupported as exc:
            raise ArtifactError(str(exc)) from exc

    def catalog(self) -> Dict[int, List[ArtifactInfo]]:
        """Return ``{order: [ArtifactInfo, ...]}`` for every stage."""
        return _catalog_cached()

    def full_introspection(self) -> List[StageIntrospection]:
        """Return the default-artifact introspection for every stage."""
        return _full_introspection_cached()

    def describe_single_artifact(self, order: int, artifact: str) -> ArtifactInfo:
        """Return ``ArtifactInfo`` for exactly one artifact (no slot schemas)."""
        module = self._module_for_order(order)
        if artifact not in list_artifacts(module):
            raise ArtifactError(f"Unknown artifact '{artifact}' for stage {order}")
        return describe_artifact(module, artifact)

    # ── Internal helpers ────────────────────────────────────────

    @staticmethod
    def _module_for_order(order: int) -> str:
        module = STAGE_MODULES.get(order)
        if module is None:
            raise ArtifactError(f"Unknown stage order: {order}")
        return module


# Module-level caches — the heavy work is module import + schema extraction,
# which only needs to happen once per process.


@lru_cache(maxsize=1)
def _catalog_cached() -> Dict[int, List[ArtifactInfo]]:
    catalog: Dict[int, List[ArtifactInfo]] = {}
    for order, module in STAGE_MODULES.items():
        catalog[order] = list_artifacts_with_meta(module)
    return catalog


@lru_cache(maxsize=1)
def _full_introspection_cached() -> List[StageIntrospection]:
    return list(introspect_all())


def _clear_caches() -> None:
    """Test helper — reset the module-level caches."""
    _catalog_cached.cache_clear()
    _full_introspection_cached.cache_clear()
