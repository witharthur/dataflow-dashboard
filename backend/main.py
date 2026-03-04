"""
Claude Code Usage Analytics - FastAPI Backend
Production-ready async API connecting MongoDB to the React dashboard.
"""

import os
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pydantic import BaseModel, Field
from pymongo import UpdateOne

load_dotenv()

# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------
app = FastAPI(
    title="Claude Code Analytics API",
    description="Analytics backend for Claude Code usage data",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        os.getenv("CORS_ORIGIN_1", "http://localhost:5173"),
        os.getenv("CORS_ORIGIN_2", "http://localhost:3000"),
        "http://localhost:8080",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# MongoDB connection lifecycle
# ---------------------------------------------------------------------------
MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
DB_NAME   = os.getenv("DB_NAME",   "claude_analytics")

@app.on_event("startup")
async def startup():
    app.state.client = AsyncIOMotorClient(MONGO_URL)
    app.state.db     = app.state.client[DB_NAME]
    # Telemetry analytics indexes
    await app.state.db["users"].create_index([("user_id", 1)], unique=True)
    await app.state.db["users"].create_index([("department", 1)])
    await app.state.db["users"].create_index([("email", 1)])
    await app.state.db["sessions"].create_index([("session_id", 1)], unique=True)
    await app.state.db["sessions"].create_index([("user_id", 1)])
    await app.state.db["sessions"].create_index([("department", 1)])
    await app.state.db["sessions"].create_index([("started_at", 1)])
    await app.state.db["events"].create_index([("event_id", 1)], unique=True)
    await app.state.db["events"].create_index([("user_id", 1), ("timestamp", 1)])
    await app.state.db["events"].create_index([("session_id", 1)])
    await app.state.db["events"].create_index([("event_type", 1)])
    await app.state.db["events"].create_index([("department", 1)])
    # Dashboard-specific indexes
    await app.state.db["users"].create_index(
        [("userId", 1)],
        unique=True,
        partialFilterExpression={"userId": {"$exists": True}},
    )
    await app.state.db["userActivity"].create_index(
        [("activityId", 1)],
        unique=True,
    )
    await app.state.db["userActivity"].create_index(
        [("userId", 1), ("timestamp", 1)]
    )
    await app.state.db["calendar"].create_index(
        [("date", 1), ("userId", 1)],
        unique=True,
    )
    print(f"[startup] Connected to MongoDB: {MONGO_URL}/{DB_NAME}")


@app.on_event("shutdown")
async def shutdown():
    app.state.client.close()
    print("[shutdown] MongoDB connection closed")


def db():
    """Shorthand to access the database from request handlers."""
    return app.state.db


def _to_utc(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def _day_start_utc(dt: datetime) -> datetime:
    dt_utc = _to_utc(dt)
    return datetime(dt_utc.year, dt_utc.month, dt_utc.day, tzinfo=timezone.utc)


def _days_between(start: datetime, end: datetime) -> list[datetime]:
    days = []
    current = _day_start_utc(start)
    last = _day_start_utc(end)
    while current <= last:
        days.append(current)
        current += timedelta(days=1)
    return days


def _parse_iso_query_datetime(value: str, field_name: str) -> datetime:
    try:
        return _to_utc(datetime.fromisoformat(value.replace("Z", "+00:00")))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=f"Invalid {field_name}: {exc}")


# ===========================================================================
# ENDPOINTS
# ===========================================================================

# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------
@app.get("/health", tags=["meta"])
async def health():
    """Returns API status and current UTC timestamp."""
    return {"status": "ok", "timestamp": datetime.now(timezone.utc).isoformat()}


# ---------------------------------------------------------------------------
# /api/overview – KPI summary cards
# ---------------------------------------------------------------------------
@app.get("/api/overview", tags=["analytics"])
async def overview():
    """
    Returns high-level KPIs:
    total_sessions, total_events, total_users, total_tokens,
    input_tokens, output_tokens, success_rate.
    """
    database = db()
    sessions_col = database["sessions"]
    events_col   = database["events"]
    users_col    = database["users"]

    total_sessions = await sessions_col.count_documents({})
    total_events   = await events_col.count_documents({})
    total_users    = await users_col.count_documents({})

    # Aggregate token totals and success rate from events
    pipeline = [
        {
            "$group": {
                "_id": None,
                "total_tokens":  {"$sum": "$total_tokens"},
                "input_tokens":  {"$sum": "$input_tokens"},
                "output_tokens": {"$sum": "$output_tokens"},
                "successes":     {"$sum": {"$cond": ["$success", 1, 0]}},
                "count":         {"$sum": 1},
            }
        }
    ]
    agg = await events_col.aggregate(pipeline).to_list(1)
    stats = agg[0] if agg else {}

    success_rate = (
        round(stats.get("successes", 0) / stats.get("count", 1) * 100, 2)
        if stats.get("count", 0) > 0 else 0.0
    )

    return {
        "total_sessions": total_sessions,
        "total_events":   total_events,
        "total_users":    total_users,
        "total_tokens":   stats.get("total_tokens", 0),
        "input_tokens":   stats.get("input_tokens", 0),
        "output_tokens":  stats.get("output_tokens", 0),
        "success_rate":   success_rate,
    }


# ---------------------------------------------------------------------------
# /api/tokens-by-role – Token consumption grouped by role
# ---------------------------------------------------------------------------
@app.get("/api/tokens-by-role", tags=["analytics"])
async def tokens_by_role():
    """
    Returns token consumption broken down by user role:
    role, total_tokens, avg_tokens, event_count.
    """
    pipeline = [
        {
            "$group": {
                "_id":          "$role",
                "total_tokens": {"$sum": "$total_tokens"},
                "avg_tokens":   {"$avg": "$total_tokens"},
                "event_count":  {"$sum": 1},
            }
        },
        {"$sort": {"total_tokens": -1}},
        {
            "$project": {
                "_id":          0,
                "role":         "$_id",
                "total_tokens": 1,
                "avg_tokens":   {"$round": ["$avg_tokens", 2]},
                "event_count":  1,
            }
        },
    ]
    result = await db()["events"].aggregate(pipeline).to_list(100)
    return result


# ---------------------------------------------------------------------------
# /api/events-over-time – Daily event counts for a line chart
# ---------------------------------------------------------------------------
@app.get("/api/events-over-time", tags=["analytics"])
async def events_over_time(
    start_date: Optional[str] = Query(None, description="ISO date string e.g. 2024-01-01"),
    end_date:   Optional[str] = Query(None, description="ISO date string e.g. 2024-01-31"),
):
    """
    Returns daily event counts between start_date and end_date.
    Falls back to the full dataset if no dates are provided.
    """
    match: dict = {}
    if start_date or end_date:
        date_filter: dict = {}
        try:
            if start_date:
                date_filter["$gte"] = datetime.fromisoformat(start_date)
            if end_date:
                date_filter["$lte"] = datetime.fromisoformat(end_date)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=f"Invalid date format: {exc}")
        match["timestamp"] = date_filter

    pipeline = [
        *([ {"$match": match} ] if match else []),
        {
            "$group": {
                "_id": {
                    "year":  {"$year":  "$timestamp"},
                    "month": {"$month": "$timestamp"},
                    "day":   {"$dayOfMonth": "$timestamp"},
                },
                "count": {"$sum": 1},
            }
        },
        {"$sort": {"_id.year": 1, "_id.month": 1, "_id.day": 1}},
        {
            "$project": {
                "_id":  0,
                "date": {
                    "$dateToString": {
                        "format": "%Y-%m-%d",
                        "date": {
                            "$dateFromParts": {
                                "year":  "$_id.year",
                                "month": "$_id.month",
                                "day":   "$_id.day",
                            }
                        },
                    }
                },
                "count": 1,
            }
        },
    ]
    result = await db()["events"].aggregate(pipeline).to_list(None)
    return result


# ---------------------------------------------------------------------------
# /api/event-type-distribution – Count by event_type (pie/bar chart)
# ---------------------------------------------------------------------------
@app.get("/api/event-type-distribution", tags=["analytics"])
async def event_type_distribution():
    """
    Returns the count of each event_type
    (e.g. code_generation, bug_fix, explanation …).
    """
    pipeline = [
        {"$group": {"_id": "$event_type", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$project": {"_id": 0, "event_type": "$_id", "count": 1}},
    ]
    raw = await db()["events"].aggregate(pipeline).to_list(100)
    total = sum(r["count"] for r in raw)
    result = [
        {**r, "percentage": round(r["count"] / total * 100, 1) if total else 0}
        for r in raw
    ]
    return result


# ---------------------------------------------------------------------------
# /api/peak-hours – Event count grouped by hour of day (0-23)
# ---------------------------------------------------------------------------
@app.get("/api/peak-hours", tags=["analytics"])
async def peak_hours():
    """
    Returns event counts for each hour of the day (0–23)
    so the frontend can visualise peak usage periods.
    """
    pipeline = [
        {"$group": {"_id": {"$hour": "$timestamp"}, "count": {"$sum": 1}}},
        {"$sort": {"_id": 1}},
        {"$project": {"_id": 0, "hour": "$_id", "count": 1}},
    ]
    result = await db()["events"].aggregate(pipeline).to_list(24)
    return result


# ---------------------------------------------------------------------------
# /api/top-languages – Languages ranked by total token usage
# ---------------------------------------------------------------------------
@app.get("/api/top-languages", tags=["analytics"])
async def top_languages(limit: int = Query(10, ge=1, le=50)):
    """
    Returns the top programming languages ordered by total token consumption.
    Optional query param: limit (default 10).
    """
    pipeline = [
        {"$match": {"language": {"$ne": None}}},
        {
            "$group": {
                "_id":          "$language",
                "total_tokens": {"$sum": "$total_tokens"},
                "event_count":  {"$sum": 1},
            }
        },
        {"$sort": {"total_tokens": -1}},
        {"$limit": limit},
        {"$project": {"_id": 0, "language": "$_id", "total_tokens": 1, "event_count": 1}},
    ]
    result = await db()["events"].aggregate(pipeline).to_list(limit)
    return result


# ---------------------------------------------------------------------------
# /api/error-analysis – Error counts by type + overall error rate
# ---------------------------------------------------------------------------
@app.get("/api/error-analysis", tags=["analytics"])
async def error_analysis():
    """
    Returns counts of each error_type and the overall error rate percentage.
    Only includes events where success=false.
    """
    events_col = db()["events"]

    total     = await events_col.count_documents({})
    errors    = await events_col.count_documents({"success": False})
    error_rate = round(errors / total * 100, 2) if total > 0 else 0.0

    pipeline = [
        {"$match": {"success": False, "error_type": {"$ne": None}}},
        {"$group": {"_id": "$error_type", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$project": {"_id": 0, "error_type": "$_id", "count": 1}},
    ]
    by_type = await events_col.aggregate(pipeline).to_list(100)

    return {
        "error_rate":    error_rate,
        "total_errors":  errors,
        "errors_by_type": by_type,
    }


# ---------------------------------------------------------------------------
# /api/dashboard/analytics - Aggregated telemetry analytics with filters
# ---------------------------------------------------------------------------
@app.get("/api/dashboard/analytics", tags=["dashboard"])
async def dashboard_analytics(
    department: Optional[str] = Query(None, description="Filter by employee department"),
    event_type: Optional[str] = Query(None, description="Filter by event type"),
    start_date: Optional[str] = Query(None, description="ISO datetime"),
    end_date: Optional[str] = Query(None, description="ISO datetime"),
):
    events_col = db()["events"]
    sessions_col = db()["sessions"]

    time_filter: dict = {}
    if start_date:
        time_filter["$gte"] = _parse_iso_query_datetime(start_date, "start_date")
    if end_date:
        time_filter["$lte"] = _parse_iso_query_datetime(end_date, "end_date")

    events_match: dict = {}
    if department:
        events_match["department"] = department
    if event_type:
        events_match["event_type"] = event_type
    if time_filter:
        events_match["timestamp"] = time_filter

    active_users_agg = await events_col.aggregate(
        [
            *([{"$match": events_match}] if events_match else []),
            {"$group": {"_id": "$user_id"}},
            {"$count": "count"},
        ]
    ).to_list(1)
    active_users = active_users_agg[0]["count"] if active_users_agg else 0

    session_ids = await events_col.distinct("session_id", events_match)
    session_count = len(session_ids)

    average_session_duration = 0.0
    if session_ids:
        sessions_match = {"session_id": {"$in": session_ids}}
        if department:
            sessions_match["department"] = department
        avg_duration_agg = await sessions_col.aggregate(
            [
                {"$match": sessions_match},
                {"$group": {"_id": None, "avg_duration": {"$avg": "$duration_seconds"}}},
            ]
        ).to_list(1)
        if avg_duration_agg:
            average_session_duration = round(float(avg_duration_agg[0].get("avg_duration", 0.0)), 2)

    event_distribution = await events_col.aggregate(
        [
            *([{"$match": events_match}] if events_match else []),
            {"$group": {"_id": "$event_type", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$project": {"_id": 0, "event_type": "$_id", "count": 1}},
        ]
    ).to_list(100)

    department_activity = await events_col.aggregate(
        [
            *([{"$match": events_match}] if events_match else []),
            {
                "$group": {
                    "_id": "$department",
                    "event_count": {"$sum": 1},
                    "active_users_set": {"$addToSet": "$user_id"},
                    "sessions_set": {"$addToSet": "$session_id"},
                }
            },
            {
                "$project": {
                    "_id": 0,
                    "department": {"$ifNull": ["$_id", "Unknown"]},
                    "event_count": 1,
                    "active_users": {"$size": "$active_users_set"},
                    "session_count": {"$size": "$sessions_set"},
                }
            },
            {"$sort": {"event_count": -1}},
        ]
    ).to_list(100)

    options_match_for_departments = {}
    options_match_for_event_types = {}
    if time_filter:
        options_match_for_departments["timestamp"] = time_filter
        options_match_for_event_types["timestamp"] = time_filter
    if event_type:
        options_match_for_departments["event_type"] = event_type
    if department:
        options_match_for_event_types["department"] = department

    department_options = sorted(
        [d for d in await events_col.distinct("department", options_match_for_departments) if d]
    )
    event_type_options = sorted(
        [e for e in await events_col.distinct("event_type", options_match_for_event_types) if e]
    )

    return {
        "active_users": active_users,
        "session_count": session_count,
        "average_session_duration": average_session_duration,
        "event_distribution": event_distribution,
        "department_activity": department_activity,
        "department_options": department_options,
        "event_type_options": event_type_options,
        "applied_filters": {
            "department": department,
            "event_type": event_type,
            "start_date": start_date,
            "end_date": end_date,
        },
    }


# ---------------------------------------------------------------------------
# /api/sessions – Paginated session list with optional role filter
# ---------------------------------------------------------------------------
@app.get("/api/sessions", tags=["sessions"])
async def list_sessions(
    page:       int           = Query(1,  ge=1),
    limit:      int           = Query(20, ge=1, le=100),
    role:       Optional[str] = Query(None, description="Filter by user role"),
    start_date: Optional[str] = Query(None),
    end_date:   Optional[str] = Query(None),
):
    """
    Returns a paginated list of sessions.
    Optional ?role=, ?start_date=, ?end_date= filters. Defaults: page=1, limit=20.
    """
    query: dict = {}
    if role:
        query["role"] = role
    if start_date or end_date:
        date_filter: dict = {}
        try:
            if start_date:
                date_filter["$gte"] = datetime.fromisoformat(start_date)
            if end_date:
                date_filter["$lte"] = datetime.fromisoformat(end_date)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=f"Invalid date: {exc}")
        query["started_at"] = date_filter

    sessions_col = db()["sessions"]
    total  = await sessions_col.count_documents(query)
    pages  = max(1, -(-total // limit))  # ceiling division
    skip   = (page - 1) * limit
    cursor = sessions_col.find(query, {"_id": 0}).skip(skip).limit(limit)
    items  = await cursor.to_list(limit)

    return {
        "page":     page,
        "limit":    limit,
        "total":    total,
        "pages":    pages,
        "sessions": items,
    }


# ---------------------------------------------------------------------------
# /api/sessions/{session_id} – Single session + its events
# ---------------------------------------------------------------------------
@app.get("/api/sessions/{session_id}", tags=["sessions"])
async def get_session(session_id: str):
    """
    Returns full detail for one session including all associated events,
    sorted by sequence_num.
    """
    database = db()

    session = await database["sessions"].find_one(
        {"session_id": session_id}, {"_id": 0}
    )
    if not session:
        raise HTTPException(status_code=404, detail=f"Session '{session_id}' not found")

    events = await database["events"].find(
        {"session_id": session_id}, {"_id": 0}
    ).sort("sequence_num", 1).to_list(None)

    return {**session, "events": events}


# ---------------------------------------------------------------------------
# Dashboard models
# ---------------------------------------------------------------------------
class DashboardUserIn(BaseModel):
    userId: str = Field(..., min_length=1)
    username: str = Field(..., min_length=1)
    email: str = Field(..., min_length=3)


class UserActivityIn(BaseModel):
    activityId: str = Field(..., min_length=1)
    userId: str = Field(..., min_length=1)
    timestamp: datetime
    actionType: str = Field(..., min_length=1)


class CheckDateRangeIn(BaseModel):
    userId: str = Field(..., min_length=1)
    rangeStart: datetime
    rangeEnd: datetime


# ---------------------------------------------------------------------------
# /api/dashboard/users - Upsert user
# ---------------------------------------------------------------------------
@app.post("/api/dashboard/users", tags=["dashboard"])
async def upsert_dashboard_user(payload: DashboardUserIn):
    users_col = db()["users"]
    doc = payload.model_dump()
    # Keep both key styles so this coexists with analytics data in the same collection.
    doc["user_id"] = payload.userId
    doc["updatedAt"] = datetime.now(timezone.utc)
    await users_col.update_one({"userId": payload.userId}, {"$set": doc}, upsert=True)
    return {"ok": True, "user": doc}


# ---------------------------------------------------------------------------
# /api/dashboard/user-activity - Insert/upsert activity
# ---------------------------------------------------------------------------
@app.post("/api/dashboard/user-activity", tags=["dashboard"])
async def upsert_user_activity(payload: UserActivityIn):
    database = db()
    user_exists = await database["users"].count_documents(
        {"$or": [{"userId": payload.userId}, {"user_id": payload.userId}]},
        limit=1,
    )
    if user_exists == 0:
        raise HTTPException(status_code=404, detail=f"userId '{payload.userId}' not found")

    doc = payload.model_dump()
    doc["timestamp"] = _to_utc(payload.timestamp)
    await database["userActivity"].update_one(
        {"activityId": payload.activityId},
        {"$set": doc},
        upsert=True,
    )
    return {"ok": True, "activity": doc}


# ---------------------------------------------------------------------------
# /api/dashboard/check-date-range - Set calendar.startWork by activity range
# ---------------------------------------------------------------------------
@app.post("/api/dashboard/check-date-range", tags=["dashboard"])
async def check_date_range(payload: CheckDateRangeIn):
    start = _to_utc(payload.rangeStart)
    end = _to_utc(payload.rangeEnd)
    if start > end:
        raise HTTPException(status_code=400, detail="rangeStart must be <= rangeEnd")

    database = db()
    user_exists = await database["users"].count_documents(
        {"$or": [{"userId": payload.userId}, {"user_id": payload.userId}]},
        limit=1,
    )
    if user_exists == 0:
        raise HTTPException(status_code=404, detail=f"userId '{payload.userId}' not found")

    activities = await database["userActivity"].find(
        {
            "userId": payload.userId,
            "timestamp": {"$gte": start, "$lte": end},
        },
        {"_id": 0, "timestamp": 1},
    ).to_list(None)

    activity_days = {
        _day_start_utc(item["timestamp"])
        for item in activities
        if item.get("timestamp") is not None
    }
    calendar_days = _days_between(start, end)

    if calendar_days:
        ops = []
        for day in calendar_days:
            ops.append(
                UpdateOne(
                    {"date": day, "userId": payload.userId},
                    {
                        "$set": {
                            "date": day,
                            "userId": payload.userId,
                            "startWork": day in activity_days,
                        }
                    },
                    upsert=True,
                )
            )
        await database["calendar"].bulk_write(ops, ordered=False)

    return {
        "ok": True,
        "userId": payload.userId,
        "rangeStart": start,
        "rangeEnd": end,
        "daysUpdated": len(calendar_days),
        "startWorkDates": [d.date().isoformat() for d in sorted(activity_days)],
    }


# ---------------------------------------------------------------------------
# /api/dashboard/calendar - Read calendar by user and optional range
# ---------------------------------------------------------------------------
@app.get("/api/dashboard/calendar", tags=["dashboard"])
async def list_calendar(
    userId: str = Query(..., description="User ID"),
    rangeStart: Optional[str] = Query(None, description="ISO datetime"),
    rangeEnd: Optional[str] = Query(None, description="ISO datetime"),
):
    query: dict = {"userId": userId}
    if rangeStart or rangeEnd:
        date_filter: dict = {}
        try:
            if rangeStart:
                date_filter["$gte"] = _day_start_utc(datetime.fromisoformat(rangeStart))
            if rangeEnd:
                date_filter["$lte"] = _day_start_utc(datetime.fromisoformat(rangeEnd))
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=f"Invalid date format: {exc}")
        query["date"] = date_filter

    items = await db()["calendar"].find(query, {"_id": 0}).sort("date", 1).to_list(None)
    return {"userId": userId, "count": len(items), "items": items}


# ---------------------------------------------------------------------------
# /api/dashboard/user-activity - Read activity by user and optional range
# ---------------------------------------------------------------------------
@app.get("/api/dashboard/user-activity", tags=["dashboard"])
async def list_user_activity(
    userId: str = Query(..., description="User ID"),
    rangeStart: Optional[str] = Query(None, description="ISO datetime"),
    rangeEnd: Optional[str] = Query(None, description="ISO datetime"),
):
    query: dict = {"userId": userId}
    if rangeStart or rangeEnd:
        ts_filter: dict = {}
        try:
            if rangeStart:
                ts_filter["$gte"] = _to_utc(datetime.fromisoformat(rangeStart))
            if rangeEnd:
                ts_filter["$lte"] = _to_utc(datetime.fromisoformat(rangeEnd))
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=f"Invalid date format: {exc}")
        query["timestamp"] = ts_filter

    items = await db()["userActivity"].find(query, {"_id": 0}).sort("timestamp", 1).to_list(None)
    return {"userId": userId, "count": len(items), "items": items}
