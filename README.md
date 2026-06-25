# geny-executor-web

**A visual studio for the [geny-executor](https://github.com/CocoRoF/geny-executor) agent pipeline — see every stage, every event, and every cost tick in real time.**

Point it at a [`geny-executor`](https://pypi.org/project/geny-executor/) install and the whole agent loop stops being a black box: the pipeline renders as an interactive flow graph, each stage lights up as it runs, and events stream in live over WebSocket. Pick a preset, hit run, and watch the agent think.

<!-- 📸 IMAGE NEEDED: hero screenshot — the full pipeline flow graph mid-execution, a stage highlighted, event log streaming on the side -->
> 📸 **Image needed** — _hero screenshot: the pipeline flow graph mid-run with a stage highlighted and the live event log on the side._

---

## 🌐 The Geny ecosystem

geny-executor-web is the **window into the engine**. It visualizes and drives [geny-executor](https://github.com/CocoRoF/geny-executor) — the same pipeline that powers the rest of the stack, all the way up to **Geny**, the product that uses everything below.

<!-- 📸 IMAGE NEEDED: a polished ecosystem diagram to replace the ASCII map below -->

```
                  Geny — the product (uses everything below)
                    │
      ┌─────────────┼──────────────┐
 agent engine    avatars      sandbox + deploy
      │             │              │
      ▼             ▼              ▼
 geny-executor  geny-avatar      GAPT
  (the engine)  (avatar editor)  (AI DevOps platform)
      ▲
      │ visualizes / drives the engine
      │
 geny-executor-web (pipeline studio)  ← you are here
```

| Project | What it is | Role in the stack |
|---|---|---|
| [**Geny**](https://github.com/CocoRoF/Geny) | Multi-agent VTuber + autonomous-worker platform | 🏛️ The product — consumes every project below |
| [**geny-executor**](https://github.com/CocoRoF/geny-executor) | 21-stage, manifest-driven agent pipeline · PyPI · MIT | ⚙️ The engine everything runs on |
| [**geny-executor-web**](https://github.com/CocoRoF/geny-executor-web) | Visual studio for the pipeline — React Flow + live WebSocket events | 🔬 See, inspect & run the engine |
| [**GAPT**](https://github.com/CocoRoF/geny-adapted-project-toolkit) | Self-hosted AI DevOps platform — sandbox · edit · build · deploy | 🛠️ Where agents safely touch real repos |
| [**geny-avatar**](https://github.com/CocoRoF/geny-avatar) | 2D live-avatar editor with AI texture generation | 🎭 Where Geny's faces are made |

> **➡️ You are here: `geny-executor-web`** — the visual studio for the engine.

---

## Why you'll want it

| Without it | With geny-executor-web |
|---|---|
| Agent loops are opaque — you read logs after the fact | Watch the pipeline execute **stage by stage, live** |
| "Which strategy is this stage actually using?" | Click any stage → see its strategies, config, and status |
| Events scroll past in a terminal | Color-coded, timestamped, expandable event stream |
| Hard to compare pipeline shapes | Switch presets (minimal / chat / agent / evaluator / geny_vtuber) and diff them visually |

---

## Features

- **🔭 Pipeline visualization** — the full geny-executor pipeline as an interactive React Flow graph. It renders **every stage the connected engine reports** (21 stages on current `geny-executor`).
- **🔍 Stage inspector** — click any stage to view its strategies, configuration, and live status.
- **⚡ Real-time execution** — watch events flow through stages over WebSocket as the agent runs.
- **📜 Event log** — color-coded, timestamped event stream with expandable payloads (carries the stable `exec.*` error codes too).
- **🎛️ Preset selector** — switch between `minimal`, `chat`, `agent`, `evaluator`, and `geny_vtuber` presets.
- **🗂️ Session management** — create and manage multiple pipeline sessions side by side.
- **🌙 Dark mode** — full dark-mode support.

<!-- 📸 IMAGE NEEDED: 2×2 feature montage — (1) flow graph, (2) stage inspector panel, (3) live event log, (4) preset selector -->
> 📸 **Image needed** — _feature montage: flow graph · stage inspector · live event log · preset selector._

---

## Architecture

```
Frontend (React + TypeScript + Vite + TailwindCSS + React Flow)
    │
    ├─ REST API ───→  FastAPI backend
    └─ WebSocket ──→  (real-time stage + event stream)
                         │
                         └─ geny-executor  (the pipeline library it visualizes)
```

The frontend never talks to an LLM directly — it drives the FastAPI backend, which constructs and runs a real `geny-executor` pipeline and streams its events back. The stage graph is built dynamically from the engine's `/api/pipeline/describe` response, so the studio always reflects the pipeline of whatever `geny-executor` version is installed.

---

## Quick start

### 1. Backend

```bash
cd backend
pip install -e .

# Set your Anthropic API key (optional — can also be set in the UI)
export ANTHROPIC_API_KEY=sk-ant-...

# Start the server
python -m app.main
# or
uvicorn app.main:app --reload
```

Backend starts at `http://localhost:8000`.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend starts at `http://localhost:5173` with an API proxy to the backend.

<!-- 📸 IMAGE NEEDED: screenshot of the running app right after `npm run dev` — empty pipeline ready to execute -->
> 📸 **Image needed** — _the running app, an idle pipeline ready to execute._

---

## API endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| GET | `/api/pipeline/describe?preset=agent` | Pipeline stage descriptions (drives the graph) |
| GET | `/api/pipeline/presets` | List available presets |
| POST | `/api/sessions` | Create a new session |
| GET | `/api/sessions` | List all sessions |
| DELETE | `/api/sessions/{id}` | Delete a session |
| POST | `/api/execute/{id}` | Execute (non-streaming) |
| WS | `/ws/execute/{id}` | Execute (streaming events) |

---

## Tech stack

**Backend:** FastAPI · uvicorn · [geny-executor](https://github.com/CocoRoF/geny-executor) · WebSocket
**Frontend:** React 18 · TypeScript · Vite · TailwindCSS · React Flow · Zustand

---

## Related projects

Part of **the Geny ecosystem** — see the [ecosystem section](#-the-geny-ecosystem) above:
[Geny](https://github.com/CocoRoF/Geny) · [geny-executor](https://github.com/CocoRoF/geny-executor) (the engine this visualizes) · [GAPT](https://github.com/CocoRoF/geny-adapted-project-toolkit) · [geny-avatar](https://github.com/CocoRoF/geny-avatar)

## License

MIT.
