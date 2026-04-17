"""Environment persistence service — save/load/diff pipeline snapshots."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional
from uuid import uuid4

from geny_executor.core.mutation import PipelineMutator


class EnvironmentService:
    """Save, load, diff pipeline environments as JSON files."""

    def __init__(self, storage_path: str = "./data/environments") -> None:
        self._storage = Path(storage_path)
        self._storage.mkdir(parents=True, exist_ok=True)

    def save(
        self,
        session,
        mutator: PipelineMutator,
        name: str,
        description: str = "",
        tags: Optional[List[str]] = None,
    ) -> str:
        snapshot = mutator.snapshot(description=name)
        env_id = uuid4().hex[:12]
        now = datetime.now(timezone.utc).isoformat()

        env_data = {
            "id": env_id,
            "name": name,
            "description": description,
            "tags": tags or [],
            "snapshot": snapshot.to_dict(),
            "created_at": now,
            "updated_at": now,
        }

        (self._storage / f"{env_id}.json").write_text(
            json.dumps(env_data, ensure_ascii=False, indent=2)
        )
        return env_id

    def load(self, env_id: str) -> Optional[Dict[str, Any]]:
        path = self._storage / f"{env_id}.json"
        if not path.exists():
            return None
        return json.loads(path.read_text())

    def list_all(self) -> List[Dict[str, Any]]:
        result = []
        for f in sorted(self._storage.glob("*.json")):
            try:
                data = json.loads(f.read_text())
                snapshot = data.get("snapshot", {})
                model_cfg = snapshot.get("model_config", {})
                stages = snapshot.get("stages", [])
                result.append(
                    {
                        "id": data["id"],
                        "name": data["name"],
                        "description": data.get("description", ""),
                        "tags": data.get("tags", []),
                        "created_at": data.get("created_at", ""),
                        "updated_at": data.get("updated_at", ""),
                        "stage_count": len(stages),
                        "model": model_cfg.get("model", "unknown"),
                    }
                )
            except (json.JSONDecodeError, KeyError):
                continue
        return result

    def update(self, env_id: str, changes: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        data = self.load(env_id)
        if data is None:
            return None
        for key in ("name", "description", "tags"):
            if key in changes and changes[key] is not None:
                data[key] = changes[key]
        data["updated_at"] = datetime.now(timezone.utc).isoformat()
        (self._storage / f"{env_id}.json").write_text(
            json.dumps(data, ensure_ascii=False, indent=2)
        )
        return data

    def delete(self, env_id: str) -> bool:
        path = self._storage / f"{env_id}.json"
        if path.exists():
            path.unlink()
            return True
        return False

    def export_json(self, env_id: str) -> Optional[str]:
        data = self.load(env_id)
        if data is None:
            return None
        return json.dumps(data, ensure_ascii=False, indent=2)

    def import_json(self, data: Dict[str, Any]) -> str:
        env_id = data.get("id") or uuid4().hex[:12]
        data["id"] = env_id
        now = datetime.now(timezone.utc).isoformat()
        data.setdefault("created_at", now)
        data["updated_at"] = now
        (self._storage / f"{env_id}.json").write_text(
            json.dumps(data, ensure_ascii=False, indent=2)
        )
        return env_id

    def diff(self, env_id_a: str, env_id_b: str) -> List[Dict[str, Any]]:
        a = self.load(env_id_a)
        b = self.load(env_id_b)
        if a is None or b is None:
            return []

        snap_a = a.get("snapshot", {})
        snap_b = b.get("snapshot", {})
        changes: List[Dict[str, Any]] = []
        self._diff_recursive(snap_a, snap_b, "", changes)
        return changes

    def _diff_recursive(
        self,
        old: Any,
        new: Any,
        prefix: str,
        changes: List[Dict[str, Any]],
    ) -> None:
        if isinstance(old, dict) and isinstance(new, dict):
            all_keys = set(old) | set(new)
            for k in sorted(all_keys):
                path = f"{prefix}.{k}" if prefix else k
                if k not in old:
                    changes.append(
                        {
                            "path": path,
                            "type": "added",
                            "old_value": None,
                            "new_value": new[k],
                        }
                    )
                elif k not in new:
                    changes.append(
                        {
                            "path": path,
                            "type": "removed",
                            "old_value": old[k],
                            "new_value": None,
                        }
                    )
                else:
                    self._diff_recursive(old[k], new[k], path, changes)
        elif isinstance(old, list) and isinstance(new, list):
            for i in range(max(len(old), len(new))):
                path = f"{prefix}[{i}]"
                if i >= len(old):
                    changes.append(
                        {
                            "path": path,
                            "type": "added",
                            "old_value": None,
                            "new_value": new[i],
                        }
                    )
                elif i >= len(new):
                    changes.append(
                        {
                            "path": path,
                            "type": "removed",
                            "old_value": old[i],
                            "new_value": None,
                        }
                    )
                else:
                    self._diff_recursive(old[i], new[i], path, changes)
        elif old != new:
            changes.append(
                {"path": prefix, "type": "changed", "old_value": old, "new_value": new}
            )
