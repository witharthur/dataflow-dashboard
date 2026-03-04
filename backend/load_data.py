"""
load_data.py
------------
Seed MongoDB for the analytics dashboard.

Supports two data sources:
1. Legacy CSV files (sessions.csv + events.csv)
2. synthetic_saas_dataset.json (auto-transformed to dashboard schema)

Usage:
    python load_data.py
    python load_data.py --sessions path/to/sessions.csv --events path/to/events.csv
    python load_data.py --dataset-json ../synthetic_saas_dataset.json
"""

import argparse
import csv
import json
import os
import sys
from collections import defaultdict
from datetime import datetime, timedelta, timezone

from dotenv import load_dotenv
from pymongo import MongoClient, UpdateOne
from pymongo.errors import BulkWriteError

load_dotenv()

MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "claude_analytics")

ROLE_MAP = {
    "admin": "tech_lead",
    "analyst": "data_scientist",
    "moderator": "senior_dev",
    "user": "junior_dev",
}

PROJECT_BY_ENDPOINT = {
    "/api/analytics/report": "data_pipeline",
    "/api/admin/audit": "infrastructure",
    "/api/auth/login": "api_service",
    "/api/auth/logout": "api_service",
    "/api/export/data": "cli_tool",
    "/api/users/{id}": "web_app",
    "/api/users": "web_app",
}

LANGUAGE_BY_ENDPOINT = {
    "/api/analytics/report": "Python",
    "/api/admin/audit": "Go",
    "/api/auth/login": "TypeScript",
    "/api/auth/logout": "TypeScript",
    "/api/export/data": "SQL",
    "/api/users/{id}": "JavaScript",
    "/api/users": "JavaScript",
}

EVENT_TYPE_BY_ENDPOINT = {
    "/api/analytics/report": "analytics_report",
    "/api/admin/audit": "admin_audit",
    "/api/auth/login": "auth_login",
    "/api/auth/logout": "auth_logout",
    "/api/export/data": "data_export",
    "/api/users/{id}": "user_lookup",
    "/api/users": "user_management",
}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _parse_bool(val) -> bool:
    return str(val).strip().lower() in {"true", "1", "yes"}


def _parse_int(val, default: int = 0) -> int:
    try:
        return int(val)
    except (ValueError, TypeError):
        return default


def _parse_dt(val):
    """Parse an ISO-8601 timestamp into timezone-aware UTC datetime."""
    if not val:
        return None
    try:
        dt = datetime.fromisoformat(str(val).replace("Z", "+00:00"))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)
    except ValueError:
        return None


def _read_csv(path: str) -> list[dict]:
    with open(path, newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def _read_json(path: str) -> dict:
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def _bulk_upsert(col, docs: list[dict], key_field: str, label: str) -> int:
    if not docs:
        return 0
    ops = [
        UpdateOne({key_field: doc[key_field]}, {"$set": doc}, upsert=True)
        for doc in docs
        if doc.get(key_field)
    ]
    if not ops:
        return 0
    try:
        result = col.bulk_write(ops, ordered=False)
        return result.upserted_count + result.modified_count
    except BulkWriteError as exc:
        print(f"[{label}] BulkWriteError: {exc.details}", file=sys.stderr)
        return 0


def _map_role(raw_role: str) -> str:
    return ROLE_MAP.get((raw_role or "").strip().lower(), "junior_dev")


def _project_for_endpoint(endpoint: str) -> str:
    return PROJECT_BY_ENDPOINT.get(endpoint or "", "api_service")


def _language_for_endpoint(endpoint: str) -> str:
    return LANGUAGE_BY_ENDPOINT.get(endpoint or "", "TypeScript")


def _event_type_for_endpoint(endpoint: str, method: str) -> str:
    if endpoint in EVENT_TYPE_BY_ENDPOINT:
        return EVENT_TYPE_BY_ENDPOINT[endpoint]
    method = (method or "request").strip().lower()
    endpoint = (endpoint or "endpoint").strip("/").replace("/", "_")
    endpoint = endpoint.replace("{", "").replace("}", "")
    return f"{method}_{endpoint}" if endpoint else f"{method}_request"


def _error_type(status_code: int, rate_limited: bool, error_message: str | None):
    if rate_limited:
        return "rate_limited"
    if status_code and status_code >= 400:
        return f"http_{status_code}"
    if error_message:
        return "request_error"
    return None


def _create_indexes(database):
    database["sessions"].create_index("session_id", unique=True)
    database["events"].create_index("event_id", unique=True)
    database["events"].create_index("session_id")
    database["events"].create_index("timestamp")
    database["users"].create_index("user_id", unique=True)


# ---------------------------------------------------------------------------
# Legacy CSV loaders
# ---------------------------------------------------------------------------

def _sessions_docs_from_csv(rows: list[dict]) -> list[dict]:
    docs = []
    for row in rows:
        docs.append(
            {
                "session_id": row.get("session_id", ""),
                "user_id": row.get("user_id", ""),
                "role": row.get("role", ""),
                "project_type": row.get("project_type", ""),
                "primary_language": row.get("primary_language", ""),
                "started_at": _parse_dt(row.get("started_at", "")),
                "ended_at": _parse_dt(row.get("ended_at", "")),
                "duration_seconds": _parse_int(row.get("duration_seconds", "0")),
                "n_events": _parse_int(row.get("n_events", "0")),
                "os": row.get("os", ""),
                "editor": row.get("editor", ""),
                "claude_version": row.get("claude_version", ""),
            }
        )
    return docs


def _events_docs_from_csv(rows: list[dict]) -> list[dict]:
    docs = []
    for row in rows:
        docs.append(
            {
                "event_id": row.get("event_id", ""),
                "session_id": row.get("session_id", ""),
                "user_id": row.get("user_id", ""),
                "role": row.get("role", ""),
                "project_type": row.get("project_type", ""),
                "language": row.get("language", ""),
                "event_type": row.get("event_type", ""),
                "timestamp": _parse_dt(row.get("timestamp", "")),
                "input_tokens": _parse_int(row.get("input_tokens", "0")),
                "output_tokens": _parse_int(row.get("output_tokens", "0")),
                "total_tokens": _parse_int(row.get("total_tokens", "0")),
                "latency_ms": _parse_int(row.get("latency_ms", "0")),
                "success": _parse_bool(row.get("success", "true")),
                "error_type": row.get("error_type") or None,
                "model": row.get("model", ""),
                "sequence_num": _parse_int(row.get("sequence_num", "0")),
            }
        )
    return docs


def _derive_users_from_sessions(db, sessions_col_name: str = "sessions") -> int:
    pipeline = [
        {
            "$group": {
                "_id": "$user_id",
                "role": {"$first": "$role"},
                "project": {"$first": "$project_type"},
                "language": {"$first": "$primary_language"},
            }
        }
    ]
    docs = []
    for doc in db[sessions_col_name].aggregate(pipeline):
        docs.append(
            {
                "user_id": doc["_id"],
                "role": doc.get("role", ""),
                "project": doc.get("project", ""),
                "language": doc.get("language", ""),
            }
        )
    return _bulk_upsert(db["users"], docs, "user_id", "users")


# ---------------------------------------------------------------------------
# JSON dataset transformer
# ---------------------------------------------------------------------------

def _build_docs_from_dataset(dataset: dict):
    users = dataset.get("users", [])
    sessions = dataset.get("sessions", [])
    requests = dataset.get("requests", [])
    tokens = dataset.get("tokens", [])

    token_type_by_id = {t.get("token_id"): t.get("type", "access") for t in tokens}

    user_meta = {}
    user_docs = []
    for user in users:
        mapped_role = _map_role(user.get("role", ""))
        doc = {
            "user_id": user.get("user_id", ""),
            "role": mapped_role,
            "project": "api_service",
            "language": "TypeScript",
            "username": user.get("username", ""),
            "email": user.get("email", ""),
            "status": user.get("status", ""),
            "created_at": _parse_dt(user.get("created_at")),
            "last_login_at": _parse_dt(user.get("last_login_at")),
        }
        user_docs.append(doc)
        user_meta[doc["user_id"]] = {
            "role": mapped_role,
            "project": doc["project"],
            "language": doc["language"],
        }

    requests_by_session = defaultdict(list)
    for request in requests:
        sid = request.get("session_id")
        if sid:
            requests_by_session[sid].append(request)

    session_docs = []
    for session in sessions:
        sid = session.get("session_id", "")
        uid = session.get("user_id", "")
        role = user_meta.get(uid, {}).get("role", "junior_dev")

        reqs = requests_by_session.get(sid, [])
        primary_endpoint = reqs[0].get("endpoint") if reqs else ""
        project_type = _project_for_endpoint(primary_endpoint)
        primary_language = _language_for_endpoint(primary_endpoint)

        started_at = _parse_dt(session.get("started_at"))
        ended_at = _parse_dt(session.get("last_activity_at"))
        duration_seconds = _parse_int(session.get("duration_seconds"), 0)
        if not ended_at and started_at and duration_seconds > 0:
            ended_at = started_at + timedelta(seconds=duration_seconds)

        session_docs.append(
            {
                "session_id": sid,
                "user_id": uid,
                "role": role,
                "project_type": project_type,
                "primary_language": primary_language,
                "started_at": started_at,
                "ended_at": ended_at,
                "duration_seconds": duration_seconds,
                "n_events": len(reqs),
                "os": session.get("os", ""),
                "editor": session.get("browser", "") or session.get("device_type", ""),
                "claude_version": "saas-1.0",
                "device_type": session.get("device_type"),
                "country": session.get("country"),
                "city": session.get("city"),
                "is_active": session.get("is_active"),
                "terminated_reason": session.get("terminated_reason"),
            }
        )

    session_lookup = {s["session_id"]: s for s in session_docs}
    event_docs = []
    for sid, reqs in requests_by_session.items():
        sorted_reqs = sorted(
            reqs,
            key=lambda request: (
                _parse_dt(request.get("timestamp")) or datetime.min.replace(tzinfo=timezone.utc)
            ),
        )
        session = session_lookup.get(sid, {})
        for seq, request in enumerate(sorted_reqs, start=1):
            status_code = _parse_int(request.get("status_code"), 0)
            rate_limited = bool(request.get("rate_limited"))
            error_message = request.get("error_message")
            success = (
                status_code in {200, 201, 202, 204, 206}
                and not rate_limited
                and not error_message
            )

            input_tokens = max(0, _parse_int(request.get("request_size_bytes"), 0) // 4)
            output_tokens = max(0, _parse_int(request.get("response_size_bytes"), 0) // 4)
            total_tokens = input_tokens + output_tokens
            endpoint = request.get("endpoint", "")

            token_type = token_type_by_id.get(request.get("token_id"), "access")
            model = "synthetic-access-model" if token_type == "access" else "synthetic-refresh-model"

            event_docs.append(
                {
                    "event_id": request.get("request_id", ""),
                    "session_id": sid,
                    "user_id": session.get("user_id", ""),
                    "role": session.get("role", "junior_dev"),
                    "project_type": session.get("project_type", _project_for_endpoint(endpoint)),
                    "language": session.get("primary_language", _language_for_endpoint(endpoint)),
                    "event_type": _event_type_for_endpoint(endpoint, request.get("method", "")),
                    "timestamp": _parse_dt(request.get("timestamp")),
                    "input_tokens": input_tokens,
                    "output_tokens": output_tokens,
                    "total_tokens": total_tokens,
                    "latency_ms": _parse_int(request.get("response_time_ms"), 0),
                    "success": success,
                    "error_type": _error_type(status_code, rate_limited, error_message),
                    "model": model,
                    "sequence_num": seq,
                    "method": request.get("method"),
                    "status_code": status_code,
                    "endpoint": endpoint,
                }
            )

    return user_docs, session_docs, event_docs


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Load analytics data into MongoDB")
    parser.add_argument("--sessions", default="sessions.csv", help="Path to sessions CSV")
    parser.add_argument("--events", default="events.csv", help="Path to events CSV")
    parser.add_argument(
        "--dataset-json",
        default=None,
        help="Path to synthetic_saas_dataset.json (if provided, CSV args are ignored)",
    )
    args = parser.parse_args()

    print(f"Connecting to MongoDB at {MONGO_URL} ...")
    client = MongoClient(MONGO_URL, serverSelectionTimeoutMS=15_000)
    database = client[DB_NAME]

    _create_indexes(database)
    print("Indexes ensured.")

    if args.dataset_json:
        if not os.path.exists(args.dataset_json):
            print(f"[ERROR] dataset JSON file not found: {args.dataset_json}", file=sys.stderr)
            client.close()
            sys.exit(1)

        payload = _read_json(args.dataset_json)
        user_docs, session_docs, event_docs = _build_docs_from_dataset(payload)

        users_written = _bulk_upsert(database["users"], user_docs, "user_id", "users")
        sessions_written = _bulk_upsert(database["sessions"], session_docs, "session_id", "sessions")
        events_written = _bulk_upsert(database["events"], event_docs, "event_id", "events")

        print(f"Users:    {len(user_docs)} rows read -> {users_written} upserted/modified")
        print(f"Sessions: {len(session_docs)} rows read -> {sessions_written} upserted/modified")
        print(f"Events:   {len(event_docs)} rows read -> {events_written} upserted/modified")
        client.close()
        print("Done.")
        return

    if os.path.exists(args.sessions):
        session_rows = _read_csv(args.sessions)
        session_docs = _sessions_docs_from_csv(session_rows)
        sessions_written = _bulk_upsert(database["sessions"], session_docs, "session_id", "sessions")
        print(f"Sessions: {len(session_rows)} rows read -> {sessions_written} upserted/modified")
    else:
        print(f"[WARN] sessions file not found: {args.sessions}")

    if os.path.exists(args.events):
        event_rows = _read_csv(args.events)
        event_docs = _events_docs_from_csv(event_rows)
        events_written = _bulk_upsert(database["events"], event_docs, "event_id", "events")
        print(f"Events:   {len(event_rows)} rows read -> {events_written} upserted/modified")
    else:
        print(f"[WARN] events file not found: {args.events}")

    users_written = _derive_users_from_sessions(database, sessions_col_name="sessions")
    print(f"Users:    {users_written} derived from sessions")

    client.close()
    print("Done.")


if __name__ == "__main__":
    main()
