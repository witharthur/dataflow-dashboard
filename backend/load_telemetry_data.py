"""
load_telemetry_data.py
----------------------
Ingest telemetry JSONL and employees CSV into MongoDB collections:
users, sessions, events.

Usage:
    python load_telemetry_data.py
    python load_telemetry_data.py --replace
    python load_telemetry_data.py --telemetry ../claude_code_telemetry/output/telemetry_logs.jsonl --employees ../claude_code_telemetry/output/employees.csv
"""

import argparse
import csv
import json
import os
import sys
from collections import defaultdict
from datetime import datetime, timezone
from typing import Optional

from dotenv import load_dotenv
from pymongo import MongoClient, UpdateOne
from pymongo.errors import BulkWriteError

load_dotenv()

MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "claude_analytics")


def parse_iso(value: Optional[str]) -> Optional[datetime]:
    if not value:
        return None
    try:
        dt = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)
    except ValueError:
        return None


def parse_int(value, default: int = 0) -> int:
    try:
        return int(float(value))
    except (TypeError, ValueError):
        return default


def parse_bool(value, default: bool = False) -> bool:
    if value is None:
        return default
    if isinstance(value, bool):
        return value
    raw = str(value).strip().lower()
    if raw in {"true", "1", "yes"}:
        return True
    if raw in {"false", "0", "no"}:
        return False
    return default


def level_number(raw_role: str) -> int:
    raw = (raw_role or "").strip().upper()
    if raw.startswith("L") and raw[1:].isdigit():
        return int(raw[1:])
    return 0


def map_role(raw_role: str, department: str) -> str:
    dep = (department or "").lower()
    lvl = level_number(raw_role)
    if "platform" in dep:
        return "devops"
    if "data" in dep or "ml" in dep:
        return "data_scientist"
    if lvl >= 7:
        return "tech_lead"
    if lvl >= 4:
        return "senior_dev"
    return "junior_dev"


def map_project_type(department: str) -> str:
    dep = (department or "").lower()
    if "platform" in dep:
        return "infrastructure"
    if "data" in dep or "ml" in dep:
        return "data_pipeline"
    if "frontend" in dep:
        return "web_app"
    if "backend" in dep:
        return "api_service"
    return "cli_tool"


def map_language(department: str) -> str:
    dep = (department or "").lower()
    if "frontend" in dep:
        return "TypeScript"
    if "platform" in dep:
        return "Go"
    if "data" in dep or "ml" in dep:
        return "Python"
    if "backend" in dep:
        return "Python"
    return "TypeScript"


def load_employees(path: str):
    rows = []
    by_user_id = {}
    by_email = {}

    with open(path, newline="", encoding="utf-8") as file_obj:
        for row in csv.DictReader(file_obj):
            email = (row.get("email") or "").strip().lower()
            user_id = (row.get("user_id") or "").strip()
            employee = {
                "user_id": user_id or None,
                "email": email or None,
                "name": (row.get("name") or row.get("full_name") or "").strip(),
                "department": (row.get("department") or row.get("practice") or "Unknown").strip(),
                "raw_role": (row.get("role") or row.get("level") or "").strip(),
                "join_date": parse_iso(row.get("join_date")),
                "location": (row.get("location") or "").strip(),
            }
            rows.append(employee)
            if employee["user_id"]:
                by_user_id[employee["user_id"]] = employee
            if employee["email"]:
                by_email[employee["email"]] = employee

    return rows, by_user_id, by_email


def create_indexes(database):
    database["users"].create_index([("user_id", 1)], unique=True)
    database["users"].create_index([("department", 1)])
    database["users"].create_index([("email", 1)])

    database["sessions"].create_index([("session_id", 1)], unique=True)
    database["sessions"].create_index([("user_id", 1)])
    database["sessions"].create_index([("department", 1)])
    database["sessions"].create_index([("started_at", 1)])

    database["events"].create_index([("event_id", 1)], unique=True)
    database["events"].create_index([("user_id", 1), ("timestamp", 1)])
    database["events"].create_index([("session_id", 1)])
    database["events"].create_index([("event_type", 1)])
    database["events"].create_index([("department", 1)])


def bulk_write_safe(collection, ops, label: str) -> int:
    if not ops:
        return 0
    try:
        result = collection.bulk_write(ops, ordered=False)
        return result.upserted_count + result.modified_count
    except BulkWriteError as exc:
        print(f"[{label}] BulkWriteError: {exc.details}", file=sys.stderr)
        return 0


def ingest_to_mongo(
    database,
    telemetry_path: str,
    employees_path: str,
    replace: bool,
    batch_size: int = 5000,
):
    employees_rows, employees_by_user_id, employees_by_email = load_employees(employees_path)

    if replace:
        database["events"].delete_many({"event_id": {"$exists": True}})
        database["sessions"].delete_many({"session_id": {"$exists": True}})
        database["users"].delete_many({"user_id": {"$exists": True}})

    create_indexes(database)

    users_state = {}
    sessions_state = {}
    session_seq = defaultdict(int)
    event_ops = []

    lines_processed = 0
    raw_events = 0
    kept_events = 0
    events_written = 0

    with open(telemetry_path, encoding="utf-8") as file_obj:
        for line in file_obj:
            lines_processed += 1
            raw = line.strip()
            if not raw:
                continue
            try:
                batch = json.loads(raw)
            except json.JSONDecodeError:
                continue

            for log_event in batch.get("logEvents", []):
                raw_events += 1
                message = log_event.get("message")
                if not message:
                    continue
                try:
                    payload = json.loads(message)
                except json.JSONDecodeError:
                    continue

                attributes = payload.get("attributes") or {}
                resource = payload.get("resource") or {}
                scope = payload.get("scope") or {}

                ts = parse_iso(attributes.get("event.timestamp"))
                if ts is None and log_event.get("timestamp"):
                    ts = datetime.fromtimestamp(
                        parse_int(log_event.get("timestamp")) / 1000,
                        tz=timezone.utc,
                    )
                if ts is None:
                    continue

                user_id = (attributes.get("user.id") or "").strip()
                session_id = (attributes.get("session.id") or "").strip()
                event_type = (
                    attributes.get("event.name")
                    or payload.get("body")
                    or "unknown"
                ).strip()
                if not user_id or not session_id or not event_type:
                    continue

                kept_events += 1
                email = (attributes.get("user.email") or "").strip().lower()
                employee = employees_by_user_id.get(user_id) or employees_by_email.get(email)

                department = (
                    (employee.get("department") if employee else None)
                    or resource.get("user.practice")
                    or "Unknown"
                )
                raw_role = (employee.get("raw_role") if employee else "") or ""
                role = map_role(raw_role, department)
                project_type = map_project_type(department)
                language = map_language(department)

                input_tokens = parse_int(attributes.get("input_tokens"))
                output_tokens = parse_int(attributes.get("output_tokens"))
                total_tokens = input_tokens + output_tokens
                latency_ms = parse_int(attributes.get("duration_ms"))
                model = (attributes.get("model") or "").strip()

                default_success = event_type != "api_error"
                success = parse_bool(attributes.get("success"), default=default_success)

                status_code = (attributes.get("status_code") or "").strip()
                error_raw = (attributes.get("error") or "").strip()
                error_type = None
                if not success:
                    if status_code:
                        error_type = f"http_{status_code}"
                    elif error_raw:
                        error_type = error_raw[:120]
                    else:
                        error_type = "unknown_error"

                session_seq[session_id] += 1
                event_id = str(log_event.get("id") or f"{session_id}-{session_seq[session_id]}")

                event_doc = {
                    "event_id": event_id,
                    "session_id": session_id,
                    "user_id": user_id,
                    "role": role,
                    "department": department,
                    "project_type": project_type,
                    "language": language,
                    "event_type": event_type,
                    "action_type": event_type,
                    "timestamp": ts,
                    "input_tokens": input_tokens,
                    "output_tokens": output_tokens,
                    "total_tokens": total_tokens,
                    "latency_ms": latency_ms,
                    "success": success,
                    "error_type": error_type,
                    "model": model,
                    "sequence_num": session_seq[session_id],
                }
                event_ops.append(
                    UpdateOne({"event_id": event_id}, {"$set": event_doc}, upsert=True)
                )
                if len(event_ops) >= batch_size:
                    events_written += bulk_write_safe(database["events"], event_ops, "events")
                    event_ops = []

                user_state = users_state.get(user_id)
                if user_state is None:
                    username = ""
                    if email and "@" in email:
                        username = email.split("@", maxsplit=1)[0]
                    elif employee and employee.get("name"):
                        username = employee["name"].replace(" ", ".").lower()
                    else:
                        username = (attributes.get("user.profile") or user_id[:12]).strip()

                    user_state = {
                        "user_id": user_id,
                        "username": username,
                        "email": email or (employee.get("email") if employee else "") or "",
                        "role": role,
                        "department": department,
                        "project": project_type,
                        "language": language,
                        "name": (employee.get("name") if employee else "") or "",
                        "join_date": employee.get("join_date") if employee else None,
                        "created_at": ts,
                        "last_seen_at": ts,
                    }
                    users_state[user_id] = user_state
                else:
                    if ts < user_state["created_at"]:
                        user_state["created_at"] = ts
                    if ts > user_state["last_seen_at"]:
                        user_state["last_seen_at"] = ts
                    if not user_state.get("email") and email:
                        user_state["email"] = email

                session_state = sessions_state.get(session_id)
                if session_state is None:
                    sessions_state[session_id] = {
                        "session_id": session_id,
                        "user_id": user_id,
                        "role": role,
                        "department": department,
                        "project_type": project_type,
                        "primary_language": language,
                        "started_at": ts,
                        "ended_at": ts,
                        "n_events": 1,
                        "os": resource.get("os.type", ""),
                        "editor": attributes.get("terminal.type", ""),
                        "claude_version": scope.get("version") or resource.get("service.version", ""),
                    }
                else:
                    if ts < session_state["started_at"]:
                        session_state["started_at"] = ts
                    if ts > session_state["ended_at"]:
                        session_state["ended_at"] = ts
                    session_state["n_events"] += 1
                    if not session_state.get("os"):
                        session_state["os"] = resource.get("os.type", "")
                    if not session_state.get("editor"):
                        session_state["editor"] = attributes.get("terminal.type", "")
                    if not session_state.get("claude_version"):
                        session_state["claude_version"] = scope.get("version") or resource.get("service.version", "")

    if event_ops:
        events_written += bulk_write_safe(database["events"], event_ops, "events")

    session_docs = []
    for doc in sessions_state.values():
        started = doc.get("started_at")
        ended = doc.get("ended_at")
        duration_seconds = 0
        if started and ended:
            duration_seconds = max(int((ended - started).total_seconds()), 0)
        doc["duration_seconds"] = duration_seconds
        session_docs.append(doc)

    user_docs = list(users_state.values())

    session_ops = [
        UpdateOne({"session_id": d["session_id"]}, {"$set": d}, upsert=True)
        for d in session_docs
    ]
    user_ops = [
        UpdateOne({"user_id": d["user_id"]}, {"$set": d}, upsert=True)
        for d in user_docs
    ]

    sessions_written = bulk_write_safe(database["sessions"], session_ops, "sessions")
    users_written = bulk_write_safe(database["users"], user_ops, "users")

    return {
        "employees_loaded": len(employees_rows),
        "lines_processed": lines_processed,
        "raw_events": raw_events,
        "kept_events": kept_events,
        "users_docs": len(user_docs),
        "sessions_docs": len(session_docs),
        "events_written": events_written,
        "users_written": users_written,
        "sessions_written": sessions_written,
    }


def main():
    parser = argparse.ArgumentParser(description="Load telemetry logs and employee data into MongoDB")
    parser.add_argument(
        "--telemetry",
        default="../claude_code_telemetry/output/telemetry_logs.jsonl",
        help="Path to telemetry_logs.jsonl",
    )
    parser.add_argument(
        "--employees",
        default="../claude_code_telemetry/output/employees.csv",
        help="Path to employees.csv",
    )
    parser.add_argument(
        "--replace",
        action="store_true",
        help="Delete existing users/sessions/events telemetry docs before insert",
    )
    args = parser.parse_args()

    if not os.path.exists(args.telemetry):
        print(f"[ERROR] telemetry file not found: {args.telemetry}", file=sys.stderr)
        sys.exit(1)
    if not os.path.exists(args.employees):
        print(f"[ERROR] employees file not found: {args.employees}", file=sys.stderr)
        sys.exit(1)

    print(f"Connecting to MongoDB at {MONGO_URL} ...")
    client = MongoClient(MONGO_URL, serverSelectionTimeoutMS=20_000)
    database = client[DB_NAME]

    summary = ingest_to_mongo(
        database=database,
        telemetry_path=args.telemetry,
        employees_path=args.employees,
        replace=args.replace,
    )

    print("Ingestion complete.")
    for key, value in summary.items():
        print(f"  {key}: {value}")

    client.close()
    print("Done.")


if __name__ == "__main__":
    main()
