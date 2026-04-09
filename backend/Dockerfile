# Build context: geny-tts-prj root (set in docker-compose.yml)
FROM python:3.12-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

RUN pip install --no-cache-dir uv

# ── 1. Install geny-executor from local source ──────────────────────────────
# geny-executor is not yet on PyPI; install from the monorepo.
# When geny-executor>=0.2.0 is published to PyPI, this block can be replaced
# with: RUN uv pip install --system "geny-executor>=0.2.0"
COPY geny-executor/pyproject.toml /tmp/geny-executor/pyproject.toml
COPY geny-executor/src/            /tmp/geny-executor/src/
RUN uv pip install --system --no-cache /tmp/geny-executor && \
    rm -rf /tmp/geny-executor

# ── 2. Install web backend dependencies ─────────────────────────────────────
RUN uv pip install --system --no-cache \
    "fastapi>=0.115.0" \
    "uvicorn[standard]>=0.30.0" \
    "websockets>=13.0" \
    "python-dotenv>=1.0.0"

# ── 3. Copy application source ───────────────────────────────────────────────
COPY geny-executor-web/backend/app/ /app/app/

EXPOSE 8088

CMD ["uvicorn", "app.main:app", \
     "--host", "0.0.0.0", \
     "--port", "8088", \
     "--access-log", \
     "--log-level", "info", \
     "--proxy-headers", \
     "--forwarded-allow-ips", "*"]
