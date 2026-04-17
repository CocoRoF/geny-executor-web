"""Service-layer exceptions that don't require heavy optional deps.

Isolating them here means routers (and test fakes) can raise/handle them
without having to import ``geny_executor`` transitively.
"""

from __future__ import annotations


class EnvironmentNotFoundError(LookupError):
    """Raised when an environment id does not exist in the store."""


class StageValidationError(ValueError):
    """Raised when a PATCH / PUT payload fails stage-level schema validation."""
