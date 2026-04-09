"""Application settings."""

from __future__ import annotations

import os

from dotenv import load_dotenv

load_dotenv()


class Settings:
    host: str = os.getenv("HOST", "0.0.0.0")
    port: int = int(os.getenv("PORT", "8088"))
    cors_origins: list[str] = os.getenv(
        "CORS_ORIGINS", "http://localhost:5174,http://localhost:3000"
    ).split(",")
    default_api_key: str = os.getenv("ANTHROPIC_API_KEY", "")


settings = Settings()
