"""FastAPI application entry point."""

from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import health, pipeline, session, execute
from app.ws import stream
from app.services.pipeline_service import PipelineService
from app.services.session_service import SessionService


@asynccontextmanager
async def lifespan(fastapi_app: FastAPI):
    """Initialize and teardown application services."""
    fastapi_app.state.pipeline_service = PipelineService()
    fastapi_app.state.session_service = SessionService()
    yield


app = FastAPI(
    title="geny-executor-web",
    version="0.2.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(pipeline.router)
app.include_router(session.router)
app.include_router(execute.router)
app.include_router(stream.router)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host=settings.host, port=settings.port, reload=True)
