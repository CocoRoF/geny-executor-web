# geny-executor-web

WebUI for the [geny-executor](https://pypi.org/project/geny-executor/) pipeline library.

Visualize, inspect, and execute the 16-stage agent pipeline in real-time.

## Features

- **Pipeline Visualization** — Interactive flow diagram of all 16 stages with React Flow
- **Stage Inspector** — Click any stage to view its strategies, configuration, and status
- **Real-time Execution** — Watch events flow through stages via WebSocket streaming
- **Event Log** — Color-coded, timestamped event stream with expandable data
- **Preset Selector** — Switch between minimal, chat, agent, evaluator, and geny_vtuber presets
- **Session Management** — Create and manage multiple pipeline sessions
- **Dark Mode** — Full dark mode support

## Architecture

```
Frontend (React + TypeScript + Vite + TailwindCSS)
    │
    ├─ REST API ──→  FastAPI Backend
    └─ WebSocket ──→  (real-time events)
                        │
                        └─ geny-executor (pipeline library)
```

## Quick Start

### 1. Backend

```bash
cd backend
pip install -e .

# Set your Anthropic API key (optional, can be set in the UI)
export ANTHROPIC_API_KEY=sk-ant-...

# Start the server
python -m app.main
# or
uvicorn app.main:app --reload
```

The backend starts at `http://localhost:8000`.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend starts at `http://localhost:5173` with API proxy to the backend.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| GET | `/api/pipeline/describe?preset=agent` | Pipeline stage descriptions |
| GET | `/api/pipeline/presets` | List available presets |
| POST | `/api/sessions` | Create a new session |
| GET | `/api/sessions` | List all sessions |
| DELETE | `/api/sessions/{id}` | Delete a session |
| POST | `/api/execute/{id}` | Execute (non-streaming) |
| WS | `/ws/execute/{id}` | Execute (streaming events) |

## Tech Stack

**Backend:** FastAPI, uvicorn, geny-executor, WebSocket  
**Frontend:** React 18, TypeScript, Vite, TailwindCSS, React Flow, Zustand
