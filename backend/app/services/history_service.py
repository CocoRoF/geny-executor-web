"""Execution history service — SQLite-backed run history (Phase 6 enhanced)."""

from __future__ import annotations

import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
from uuid import uuid4

_ALLOWED_ORDERS = frozenset(
    {
        "created_at DESC",
        "created_at ASC",
        "total_cost_usd DESC",
        "duration_ms DESC",
    }
)


class HistoryService:
    """Persist and query execution runs, stage timings, tool calls in SQLite."""

    def __init__(self, storage_path: str = "./data/history") -> None:
        self._storage = Path(storage_path)
        self._storage.mkdir(parents=True, exist_ok=True)
        self._db = self._init_db()

    def _init_db(self) -> sqlite3.Connection:
        db = sqlite3.connect(
            str(self._storage / "history.db"),
            check_same_thread=False,
        )
        db.row_factory = sqlite3.Row
        db.execute("PRAGMA journal_mode=WAL")
        db.execute("PRAGMA foreign_keys=ON")
        db.executescript(
            """
            CREATE TABLE IF NOT EXISTS executions (
                id TEXT PRIMARY KEY,
                session_id TEXT NOT NULL,
                input_text TEXT,
                result_text TEXT,
                success INTEGER,
                status TEXT DEFAULT 'completed',
                iterations INTEGER,
                total_cost_usd REAL DEFAULT 0.0,
                model TEXT,
                events_json TEXT,
                environment_id TEXT,
                environment_snapshot_json TEXT,
                created_at TEXT,
                finished_at TEXT,
                duration_ms INTEGER,
                total_tokens INTEGER DEFAULT 0,
                input_tokens INTEGER DEFAULT 0,
                output_tokens INTEGER DEFAULT 0,
                cache_read_tokens INTEGER DEFAULT 0,
                cache_write_tokens INTEGER DEFAULT 0,
                thinking_tokens INTEGER DEFAULT 0,
                tool_call_count INTEGER DEFAULT 0,
                error_type TEXT,
                error_message TEXT,
                error_stage INTEGER
            );

            CREATE TABLE IF NOT EXISTS stage_timings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                execution_id TEXT NOT NULL REFERENCES executions(id) ON DELETE CASCADE,
                iteration INTEGER NOT NULL,
                stage_order INTEGER NOT NULL,
                stage_name TEXT NOT NULL,
                started_at TEXT NOT NULL,
                finished_at TEXT NOT NULL,
                duration_ms INTEGER NOT NULL,
                input_tokens INTEGER DEFAULT 0,
                output_tokens INTEGER DEFAULT 0,
                was_cached BOOLEAN DEFAULT FALSE,
                was_skipped BOOLEAN DEFAULT FALSE,
                tool_name TEXT,
                tool_success BOOLEAN,
                tool_duration_ms INTEGER
            );

            CREATE TABLE IF NOT EXISTS tool_calls (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                execution_id TEXT NOT NULL REFERENCES executions(id) ON DELETE CASCADE,
                iteration INTEGER NOT NULL,
                tool_name TEXT NOT NULL,
                input_json TEXT,
                output_text TEXT,
                is_error BOOLEAN DEFAULT FALSE,
                duration_ms INTEGER DEFAULT 0,
                called_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS execution_tags (
                execution_id TEXT NOT NULL REFERENCES executions(id) ON DELETE CASCADE,
                tag TEXT NOT NULL,
                PRIMARY KEY (execution_id, tag)
            );

            CREATE INDEX IF NOT EXISTS idx_session ON executions(session_id);
            CREATE INDEX IF NOT EXISTS idx_created ON executions(created_at);
            CREATE INDEX IF NOT EXISTS idx_exec_status ON executions(status);
            CREATE INDEX IF NOT EXISTS idx_exec_model ON executions(model);
            CREATE INDEX IF NOT EXISTS idx_timing_exec ON stage_timings(execution_id);
            CREATE INDEX IF NOT EXISTS idx_tool_exec ON tool_calls(execution_id);
            """
        )
        db.commit()
        return db

    # ── Record (legacy compat + enhanced) ────────────────

    def record(
        self,
        session_id: str,
        input_text: str,
        result_text: str,
        success: bool,
        iterations: int = 0,
        total_cost_usd: float = 0.0,
        model: str = "",
        events: Optional[List[Dict]] = None,
        snapshot_dict: Optional[Dict] = None,
        duration_ms: Optional[int] = None,
        environment_id: Optional[str] = None,
        total_tokens: int = 0,
        input_tokens: int = 0,
        output_tokens: int = 0,
        cache_read_tokens: int = 0,
        cache_write_tokens: int = 0,
        thinking_tokens: int = 0,
        tool_call_count: int = 0,
        error_type: Optional[str] = None,
        error_message: Optional[str] = None,
        error_stage: Optional[int] = None,
    ) -> str:
        run_id = uuid4().hex[:12]
        now = datetime.now(timezone.utc).isoformat()
        status = "completed" if success else "error"
        self._db.execute(
            "INSERT INTO executions"
            " (id, session_id, input_text, result_text, success, status,"
            "  iterations, total_cost_usd, model, events_json,"
            "  environment_id, environment_snapshot_json, created_at, finished_at,"
            "  duration_ms, total_tokens, input_tokens, output_tokens,"
            "  cache_read_tokens, cache_write_tokens, thinking_tokens,"
            "  tool_call_count, error_type, error_message, error_stage)"
            " VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
            (
                run_id,
                session_id,
                input_text,
                result_text,
                int(success),
                status,
                iterations,
                total_cost_usd,
                model,
                json.dumps(events) if events else None,
                environment_id,
                json.dumps(snapshot_dict) if snapshot_dict else None,
                now,
                now if success else None,
                duration_ms,
                total_tokens,
                input_tokens,
                output_tokens,
                cache_read_tokens,
                cache_write_tokens,
                thinking_tokens,
                tool_call_count,
                error_type,
                error_message,
                error_stage,
            ),
        )
        self._db.commit()
        return run_id

    # ── Stage & Tool recording ───────────────────────────

    def record_stage_timing(
        self,
        execution_id: str,
        iteration: int,
        stage_order: int,
        stage_name: str,
        started_at: str,
        finished_at: str,
        duration_ms: int,
        input_tokens: int = 0,
        output_tokens: int = 0,
        was_cached: bool = False,
        was_skipped: bool = False,
        tool_name: Optional[str] = None,
        tool_success: Optional[bool] = None,
        tool_duration_ms: Optional[int] = None,
    ) -> None:
        self._db.execute(
            "INSERT INTO stage_timings"
            " (execution_id, iteration, stage_order, stage_name,"
            "  started_at, finished_at, duration_ms,"
            "  input_tokens, output_tokens, was_cached, was_skipped,"
            "  tool_name, tool_success, tool_duration_ms)"
            " VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
            (
                execution_id,
                iteration,
                stage_order,
                stage_name,
                started_at,
                finished_at,
                duration_ms,
                input_tokens,
                output_tokens,
                was_cached,
                was_skipped,
                tool_name,
                tool_success,
                tool_duration_ms,
            ),
        )
        self._db.commit()

    def record_tool_call(
        self,
        execution_id: str,
        iteration: int,
        tool_name: str,
        called_at: str,
        input_json: Optional[str] = None,
        output_text: Optional[str] = None,
        is_error: bool = False,
        duration_ms: int = 0,
    ) -> None:
        self._db.execute(
            "INSERT INTO tool_calls"
            " (execution_id, iteration, tool_name, input_json, output_text,"
            "  is_error, duration_ms, called_at)"
            " VALUES (?,?,?,?,?,?,?,?)",
            (
                execution_id,
                iteration,
                tool_name,
                input_json[:10000] if input_json else None,
                output_text[:5000] if output_text else None,
                is_error,
                duration_ms,
                called_at,
            ),
        )
        self._db.commit()

    def add_tags(self, execution_id: str, tags: List[str]) -> None:
        for tag in tags:
            self._db.execute(
                "INSERT OR IGNORE INTO execution_tags (execution_id, tag) VALUES (?,?)",
                (execution_id, tag),
            )
        self._db.commit()

    # ── Query ────────────────────────────────────────────

    def get(self, run_id: str) -> Optional[Dict[str, Any]]:
        row = self._db.execute(
            "SELECT * FROM executions WHERE id = ?", (run_id,)
        ).fetchone()
        return self._row_to_dict(row) if row else None

    def get_detail(self, run_id: str) -> Optional[Dict[str, Any]]:
        """Full detail including stage_timings and tool_calls."""
        base = self.get(run_id)
        if not base:
            return None

        base["stage_timings"] = [
            dict(r)
            for r in self._db.execute(
                "SELECT * FROM stage_timings WHERE execution_id = ?"
                " ORDER BY iteration, stage_order",
                (run_id,),
            ).fetchall()
        ]
        base["tool_call_records"] = [
            dict(r)
            for r in self._db.execute(
                "SELECT * FROM tool_calls WHERE execution_id = ? ORDER BY called_at",
                (run_id,),
            ).fetchall()
        ]
        # Tags
        tag_rows = self._db.execute(
            "SELECT tag FROM execution_tags WHERE execution_id = ?", (run_id,)
        ).fetchall()
        base["tags"] = [tr["tag"] for tr in tag_rows]

        return base

    def list_runs(
        self,
        session_id: Optional[str] = None,
        model: Optional[str] = None,
        status: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
        order_by: str = "created_at DESC",
    ) -> List[Dict[str, Any]]:
        where_clauses: List[str] = []
        params: List[Any] = []

        if session_id:
            where_clauses.append("session_id = ?")
            params.append(session_id)
        if model:
            where_clauses.append("model = ?")
            params.append(model)
        if status:
            where_clauses.append("status = ?")
            params.append(status)

        where = ("WHERE " + " AND ".join(where_clauses)) if where_clauses else ""

        if order_by not in _ALLOWED_ORDERS:
            order_by = "created_at DESC"

        rows = self._db.execute(
            f"SELECT * FROM executions {where} ORDER BY {order_by} LIMIT ? OFFSET ?",  # noqa: S608
            (*params, limit, offset),
        ).fetchall()
        return [self._row_to_dict(r) for r in rows]

    def count_runs(
        self,
        session_id: Optional[str] = None,
        model: Optional[str] = None,
        status: Optional[str] = None,
    ) -> int:
        where_clauses: List[str] = []
        params: List[Any] = []
        if session_id:
            where_clauses.append("session_id = ?")
            params.append(session_id)
        if model:
            where_clauses.append("model = ?")
            params.append(model)
        if status:
            where_clauses.append("status = ?")
            params.append(status)
        where = ("WHERE " + " AND ".join(where_clauses)) if where_clauses else ""
        return self._db.execute(
            f"SELECT COUNT(*) FROM executions {where}", params  # noqa: S608
        ).fetchone()[0]

    def get_events(self, run_id: str) -> List[Dict]:
        row = self._db.execute(
            "SELECT events_json FROM executions WHERE id = ?", (run_id,)
        ).fetchone()
        if row and row["events_json"]:
            return json.loads(row["events_json"])
        return []

    def delete(self, run_id: str) -> bool:
        cursor = self._db.execute("DELETE FROM executions WHERE id = ?", (run_id,))
        self._db.commit()
        return cursor.rowcount > 0

    def export_run(self, run_id: str) -> Optional[Dict[str, Any]]:
        return self.get_detail(run_id)

    # ── Waterfall / Performance ──────────────────────────

    def get_waterfall(self, run_id: str) -> Optional[Dict[str, Any]]:
        """Waterfall chart data for an execution."""
        base = self.get(run_id)
        if not base:
            return None

        timings = [
            dict(r)
            for r in self._db.execute(
                "SELECT * FROM stage_timings WHERE execution_id = ?"
                " ORDER BY iteration, stage_order",
                (run_id,),
            ).fetchall()
        ]

        iterations: Dict[int, List[Dict]] = {}
        for t in timings:
            it = t["iteration"]
            if it not in iterations:
                iterations[it] = []
            iterations[it].append(t)

        return {
            "execution_id": run_id,
            "total_duration_ms": base.get("duration_ms", 0),
            "iterations": [
                {
                    "iteration": it,
                    "stages": [
                        {
                            "order": s["stage_order"],
                            "name": s["stage_name"],
                            "duration_ms": s["duration_ms"],
                            "was_cached": bool(s.get("was_cached")),
                            "was_skipped": bool(s.get("was_skipped")),
                            "tokens": (s.get("input_tokens", 0) or 0)
                            + (s.get("output_tokens", 0) or 0),
                        }
                        for s in stages
                    ],
                }
                for it, stages in sorted(iterations.items())
            ],
        }

    def get_stage_stats(
        self, session_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Aggregate stage performance stats."""
        where = "WHERE e.session_id = ?" if session_id else ""
        params: List[Any] = [session_id] if session_id else []

        rows = self._db.execute(
            f"SELECT"  # noqa: S608
            f" st.stage_order,"
            f" st.stage_name,"
            f" COUNT(*) as count,"
            f" AVG(st.duration_ms) as avg_ms,"
            f" MIN(st.duration_ms) as min_ms,"
            f" MAX(st.duration_ms) as max_ms,"
            f" SUM(CASE WHEN st.was_cached THEN 1 ELSE 0 END) as cache_hits,"
            f" SUM(CASE WHEN st.was_skipped THEN 1 ELSE 0 END) as skips,"
            f" AVG(st.input_tokens) as avg_input_tokens,"
            f" AVG(st.output_tokens) as avg_output_tokens"
            f" FROM stage_timings st"
            f" JOIN executions e ON e.id = st.execution_id"
            f" {where}"
            f" GROUP BY st.stage_order, st.stage_name"
            f" ORDER BY st.stage_order",
            params,
        ).fetchall()
        return [dict(r) for r in rows]

    # ── Cost Analysis ────────────────────────────────────

    def get_cost_summary(
        self, session_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Cost summary grouped by model."""
        where = "WHERE session_id = ?" if session_id else ""
        params: List[Any] = [session_id] if session_id else []

        rows = self._db.execute(
            f"SELECT"  # noqa: S608
            f" model,"
            f" COUNT(*) as executions,"
            f" SUM(total_cost_usd) as total_cost,"
            f" SUM(total_tokens) as total_tokens,"
            f" SUM(input_tokens) as total_input,"
            f" SUM(output_tokens) as total_output,"
            f" SUM(cache_read_tokens) as total_cache_read,"
            f" SUM(cache_write_tokens) as total_cache_write,"
            f" SUM(thinking_tokens) as total_thinking,"
            f" SUM(tool_call_count) as total_tools,"
            f" AVG(total_cost_usd) as avg_cost"
            f" FROM executions"
            f" {where}"
            f" GROUP BY model",
            params,
        ).fetchall()

        by_model = [dict(r) for r in rows]
        return {
            "session_id": session_id,
            "by_model": by_model,
            "total_cost": sum(r.get("total_cost") or 0 for r in by_model),
            "total_executions": sum(r.get("executions") or 0 for r in by_model),
        }

    def get_cost_trend(
        self,
        session_id: Optional[str] = None,
        granularity: str = "hour",
        limit: int = 168,
    ) -> List[Dict[str, Any]]:
        """Cost trend over time."""
        fmt_map = {
            "hour": "%Y-%m-%dT%H:00:00",
            "day": "%Y-%m-%d",
            "week": "%Y-W%W",
        }
        fmt = fmt_map.get(granularity, "%Y-%m-%dT%H:00:00")

        where = "WHERE session_id = ?" if session_id else ""
        params: List[Any] = [session_id] if session_id else []

        rows = self._db.execute(
            f"SELECT"  # noqa: S608
            f" strftime('{fmt}', created_at) as period,"
            f" COUNT(*) as executions,"
            f" SUM(total_cost_usd) as cost,"
            f" SUM(total_tokens) as tokens"
            f" FROM executions"
            f" {where}"
            f" GROUP BY period"
            f" ORDER BY period DESC"
            f" LIMIT ?",
            (*params, limit),
        ).fetchall()

        return [dict(r) for r in reversed(list(rows))]

    def get_stats(self, session_id: Optional[str] = None) -> Dict[str, Any]:
        """Aggregate statistics."""
        where = "WHERE session_id = ?" if session_id else ""
        params: List[Any] = [session_id] if session_id else []

        row = self._db.execute(
            f"SELECT"  # noqa: S608
            f" COUNT(*) as total,"
            f" SUM(CASE WHEN status='completed' OR success=1 THEN 1 ELSE 0 END) as completed,"
            f" SUM(CASE WHEN status='error' OR success=0 THEN 1 ELSE 0 END) as errors,"
            f" SUM(total_cost_usd) as total_cost,"
            f" SUM(total_tokens) as total_tokens,"
            f" AVG(duration_ms) as avg_duration_ms"
            f" FROM executions {where}",
            params,
        ).fetchone()

        return {
            "total": row["total"] or 0,
            "completed": row["completed"] or 0,
            "errors": row["errors"] or 0,
            "total_cost": row["total_cost"] or 0.0,
            "total_tokens": row["total_tokens"] or 0,
            "avg_duration_ms": row["avg_duration_ms"] or 0.0,
        }

    # ── Internal ─────────────────────────────────────────

    @staticmethod
    def _row_to_dict(row: sqlite3.Row) -> Dict[str, Any]:
        d = dict(row)
        d["success"] = bool(d.get("success"))
        for json_field in ("events_json", "environment_snapshot_json"):
            val = d.pop(json_field, None)
            key = json_field.replace("_json", "")
            d[key] = json.loads(val) if val else None
        return d
