# geny-executor-web API Reference

> **Base URL**: `http://localhost:58088` (nginx proxy)  
> **Backend direct**: `http://localhost:8088`  
> **Requires**: `geny-executor >= 0.11.0`

---

## Health & Config

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Service health status |
| GET | `/api/config` | Server-side config hints |

### GET /health
```json
{ "status": "ok", "version": "0.7.0" }
```

### GET /api/config
```json
{ "api_key_configured": true }
```

---

## Sessions

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/sessions` | Create a new pipeline session |
| GET | `/api/sessions` | List all active sessions |
| GET | `/api/sessions/{id}` | Get session details |
| DELETE | `/api/sessions/{id}` | Delete a session |

### POST /api/sessions
```json
{
  "preset": "chat",       // minimal | chat | agent | evaluator | geny_vtuber
  "api_key": "sk-...",
  "system_prompt": "",
  "model": "claude-sonnet-4-20250514",
  "max_iterations": 50
}
```

---

## Stage Editor

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/sessions/{id}/stages` | List all stages |
| GET | `/api/sessions/{id}/stages/{order}` | Get stage detail |
| PATCH | `/api/sessions/{id}/stages/{order}/strategy` | Swap strategy impl |
| PATCH | `/api/sessions/{id}/stages/{order}/config` | Update stage config |
| PATCH | `/api/sessions/{id}/stages/{order}/active` | Enable/disable stage |
| PATCH | `/api/sessions/{id}/model` | Change model |
| PATCH | `/api/sessions/{id}/pipeline-config` | Update pipeline config |
| GET | `/api/sessions/{id}/mutations` | Mutation history |
| POST | `/api/sessions/{id}/snapshot` | Save snapshot |
| POST | `/api/sessions/{id}/restore` | Restore snapshot |

---

## Tool Manager

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/sessions/{id}/tools` | List all tools |
| GET | `/api/sessions/{id}/tools/{name}` | Get tool info |
| DELETE | `/api/sessions/{id}/tools/{name}` | Remove ad-hoc tool |
| POST | `/api/sessions/{id}/tools/{name}/test` | Test a tool |
| POST | `/api/sessions/{id}/tools/adhoc` | Create ad-hoc tool |
| PUT | `/api/sessions/{id}/tools/adhoc/{name}` | Update ad-hoc tool |
| GET | `/api/sessions/{id}/tool-presets` | List tool presets |
| POST | `/api/sessions/{id}/tool-presets/{preset}` | Apply tool preset |
| GET | `/api/sessions/{id}/mcp-servers` | List MCP servers |
| POST | `/api/sessions/{id}/mcp-servers` | Connect MCP server |
| DELETE | `/api/sessions/{id}/mcp-servers/{name}` | Disconnect MCP |
| POST | `/api/sessions/{id}/mcp-servers/{name}/test` | Test MCP connection |
| GET | `/api/sessions/{id}/tool-scope` | Get tool scope |
| PUT | `/api/sessions/{id}/tool-scope` | Update tool scope |

---

## Environments

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/environments` | List saved environments |
| POST | `/api/environments` | Save current session as environment |
| GET | `/api/environments/{id}` | Get environment details |
| PUT | `/api/environments/{id}` | Update environment metadata |
| DELETE | `/api/environments/{id}` | Delete environment |
| GET | `/api/environments/{id}/export` | Export as JSON |
| POST | `/api/environments/import` | Import from JSON |
| POST | `/api/environments/diff` | Diff two environments |
| POST | `/api/environments/{id}/preset` | Mark as preset |
| DELETE | `/api/environments/{id}/preset` | Remove preset flag |
| GET | `/api/environments/{id}/share` | Generate share link |

---

## Execution History & Analytics

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/sessions/{id}/history` | Session execution history |
| GET | `/api/sessions/{id}/history/{run_id}` | Execution detail |
| GET | `/api/sessions/{id}/history/{run_id}/events` | Execution events |
| GET | `/api/sessions/{id}/history/{run_id}/export` | Export execution |
| DELETE | `/api/sessions/{id}/history/{run_id}` | Delete execution |
| GET | `/api/history` | Global execution history |
| GET | `/api/history/{run_id}` | Global run detail |
| GET | `/api/history/{run_id}/waterfall` | Waterfall timing data |
| GET | `/api/analytics/stats` | Execution statistics |
| GET | `/api/analytics/stage-stats` | Per-stage statistics |
| GET | `/api/analytics/cost` | Cost summary by model |
| GET | `/api/analytics/cost-trend` | Cost trend over time |
| POST | `/api/ab-test` | Create A/B test |
| GET | `/api/ab-test/{exec_a}/{exec_b}` | Compare A/B results |

---

## WebSocket

| Protocol | Path | Description |
|----------|------|-------------|
| WS | `/ws/execute/{session_id}` | Stream pipeline execution events |
| WS | `/ws/editor/{session_id}` | Real-time editor sync |

### WS /ws/execute/{session_id}

Send: `{ "input": "user message" }`

Receive events:
```json
{ "type": "pipeline.start", "data": {} }
{ "type": "stage.start", "stage": "think", "iteration": 1 }
{ "type": "stage.complete", "stage": "think", "iteration": 1, "data": {...} }
{ "type": "pipeline.complete", "data": { "text": "...", "total_cost_usd": 0.01 } }
```

---

## Error Responses

All errors follow:
```json
{ "detail": "Error message" }
```

| Code | Meaning |
|------|---------|
| 400 | Bad request (missing API key, invalid input) |
| 404 | Resource not found |
| 422 | Validation error (schema mismatch) |
| 500 | Internal server error |
