"""Application settings.

Memory-backend configuration
----------------------------
`MEMORY_PROVIDER` picks the default provider name handed to
`geny_executor.memory.factory.MemoryProviderFactory.build`. The
remaining `MEMORY_*` vars feed into the per-provider config dict.

Supported defaults:
  * ``ephemeral`` — in-memory only, lost on process restart.
  * ``file``      — filesystem-rooted, uses ``MEMORY_ROOT``.
  * ``sql``       — sqlite or postgres, routed by DSN scheme.
    ``MEMORY_DSN`` accepts a filesystem path (SQLite) or a
    ``postgresql://`` / ``postgres://`` URL. Override with
    ``MEMORY_DIALECT`` (``sqlite`` | ``postgres``).
"""

from __future__ import annotations

import os

from dotenv import load_dotenv

load_dotenv()


_DEFAULT_MEMORY_PROVIDER = "ephemeral"


class Settings:
    host: str = os.getenv("HOST", "0.0.0.0")
    port: int = int(os.getenv("PORT", "8088"))
    cors_origins: list[str] = os.getenv(
        "CORS_ORIGINS", "http://localhost:5174,http://localhost:3000"
    ).split(",")
    default_api_key: str = os.getenv("ANTHROPIC_API_KEY", "")

    # ── Memory backend ─────────────────────────────────────────
    memory_provider: str = os.getenv("MEMORY_PROVIDER", _DEFAULT_MEMORY_PROVIDER)
    memory_dsn: str = os.getenv("MEMORY_DSN", "")
    memory_dialect: str = os.getenv("MEMORY_DIALECT", "")
    memory_root: str = os.getenv("MEMORY_ROOT", "")
    memory_timezone: str = os.getenv("MEMORY_TIMEZONE", "")
    memory_scope: str = os.getenv("MEMORY_SCOPE", "session")

    def default_memory_config(self) -> dict:
        """Assemble the per-session memory config dict from env vars.

        Returns a config accepted by `MemoryProviderFactory.build`.
        Unset optional fields are omitted so the factory applies its
        own defaults rather than seeing empty strings.
        """
        provider = (self.memory_provider or _DEFAULT_MEMORY_PROVIDER).strip().lower()
        cfg: dict = {"provider": provider, "scope": self.memory_scope or "session"}

        if provider == "file":
            if not self.memory_root:
                raise ValueError("MEMORY_PROVIDER=file requires MEMORY_ROOT to be set")
            cfg["root"] = self.memory_root
        elif provider == "sql":
            if not self.memory_dsn:
                raise ValueError("MEMORY_PROVIDER=sql requires MEMORY_DSN to be set")
            cfg["dsn"] = self.memory_dsn
            if self.memory_dialect:
                cfg["dialect"] = self.memory_dialect.lower()

        if self.memory_timezone:
            cfg["timezone"] = self.memory_timezone
        return cfg


settings = Settings()
