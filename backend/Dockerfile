FROM python:3.12-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

RUN pip install --no-cache-dir uv

RUN uv pip install --system --no-cache \
    "geny-executor>=0.2.0" \
    "fastapi>=0.115.0" \
    "uvicorn[standard]>=0.30.0" \
    "websockets>=13.0" \
    "python-dotenv>=1.0.0"

COPY app/ /app/app/

EXPOSE 8088

CMD ["uvicorn", "app.main:app", \
     "--host", "0.0.0.0", \
     "--port", "8088", \
     "--access-log", \
     "--log-level", "info", \
     "--proxy-headers", \
     "--forwarded-allow-ips", "*"]
