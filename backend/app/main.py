"""FastAPI application entry point."""

from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import health, pipeline, session, execute
from app.routers import stage_editor, tool_manager, environment, history, catalog
from app.ws import stream
from app.ws.editor_sync import editor_sync_manager
from app.ws import editor_sync as editor_sync_ws
from app.services.pipeline_service import PipelineService
from app.services.session_service import SessionService
from app.services.mutation_service import MutationService
from app.services.tool_service import ToolService
from app.services.environment_service import EnvironmentService
from app.services.history_service import HistoryService
from app.services.artifact_service import ArtifactService


@asynccontextmanager
async def lifespan(fastapi_app: FastAPI):
    """Initialize and teardown application services."""
    fastapi_app.state.pipeline_service = PipelineService()
    fastapi_app.state.session_service = SessionService()
    fastapi_app.state.mutation_service = MutationService()
    fastapi_app.state.tool_service = ToolService()
    fastapi_app.state.environment_service = EnvironmentService()
    fastapi_app.state.history_service = HistoryService()
    fastapi_app.state.artifact_service = ArtifactService()
    fastapi_app.state.editor_sync = editor_sync_manager
    yield


app = FastAPI(
    title="geny-executor-web",
    version="0.8.0",
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
app.include_router(stage_editor.router)
app.include_router(tool_manager.router)
app.include_router(environment.router)
app.include_router(catalog.router)
app.include_router(history.router)
app.include_router(stream.router)
app.include_router(editor_sync_ws.router)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host=settings.host, port=settings.port, reload=True)
