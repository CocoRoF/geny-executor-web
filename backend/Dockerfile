FROM python:3.12-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

RUN pip install --no-cache-dir uv

COPY pyproject.toml /app/
RUN uv pip install --system --no-cache -r pyproject.toml

COPY app/ /app/app/

EXPOSE 8088

CMD ["uvicorn", "app.main:app", \
     "--host", "0.0.0.0", \
     "--port", "8088", \
     "--access-log", \
     "--log-level", "info", \
     "--proxy-headers", \
     "--forwarded-allow-ips", "*"]
