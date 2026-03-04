import json
import random
import uuid
import hashlib
from datetime import datetime, timedelta, timezone

CONFIG = {
    "total_users": 500,
    "total_sessions": 3000,
    "total_tokens": 4500,
    "total_requests": 25000,
    "time_range_days": 30
}

def rdate(start, end):
    diff = int((end - start).total_seconds())
    if diff <= 0:
        return start
    return start + timedelta(seconds=random.randint(0, diff))

def weighted_timestamp(start, end):
    while True:
        ts = rdate(start, end)
        h = ts.hour
        is_peak = (8 <= h < 12) or (17 <= h < 21)
        prob = 1.0 if is_peak else 0.5
        if ts.weekday() >= 5:
            prob *= 0.7
        # 10% burst probability roughly modeled by accepting more
        if random.random() < prob:
            return ts

def generate_ip():
    return f"{random.randint(11, 250)}.{random.randint(0, 255)}.{random.randint(0, 255)}.{random.randint(1, 254)}"

LOCATIONS = [
    ("US", "New York"), ("US", "San Francisco"), ("UK", "London"),
    ("DE", "Berlin"), ("FR", "Paris"), ("JP", "Tokyo"),
    ("CA", "Toronto"), ("AU", "Sydney"), ("IN", "Bengaluru")
]

def main():
    print("Generating dataset...")
    end_time = datetime.now(timezone.utc)
    start_time = end_time - timedelta(days=CONFIG["time_range_days"])

    roles = ["admin", "moderator", "analyst", "user"]
    role_weights = [4, 10, 16, 70]
    statuses = ["active", "blocked", "pending", "deleted"]
    status_weights = [85, 5, 5, 5]

    permissions_map = {
        "admin": ["read", "write", "delete", "admin", "export"],
        "moderator": ["read", "write", "delete"],
        "analyst": ["read", "export"],
        "user": ["read", "write"]
    }

    device_types = ["desktop", "mobile", "tablet"]
    browsers = ["Chrome", "Firefox", "Safari", "Edge"]
    oses = ["Windows", "macOS", "Linux", "iOS", "Android"]

    users = []
    sessions = []
    tokens = []
    requests = []
    audit_logs = []

    # 1. Users
    for _ in range(CONFIG["total_users"]):
        role = random.choices(roles, weights=role_weights)[0]
        status = random.choices(statuses, weights=status_weights)[0]
        created_at = rdate(start_time - timedelta(days=365), start_time)
        users.append({
            "user_id": str(uuid.uuid4()),
            "username": f"user_{random.randint(1000, 999999)}",
            "email": f"user_{random.randint(1000, 999999)}@domain.com",
            "role": role,
            "permissions": permissions_map[role],
            "created_at": created_at.isoformat(),
            "last_login_at": None,
            "status": status,
            "mfa_enabled": random.random() < 0.40,
            "failed_login_attempts": random.randint(0, 10) if status == "blocked" else random.randint(0, 3)
        })

    # 2. Sessions
    eligible_users = [u for u in users if u["status"] not in ["blocked", "deleted"]]
    for _ in range(CONFIG["total_sessions"]):
        user = random.choice(eligible_users)
        started_at = weighted_timestamp(start_time, end_time)
        is_active = random.random() < 0.60
        duration_seconds = random.randint(300, 86400) if not is_active else int((end_time - started_at).total_seconds())
        last_activity_at = started_at + timedelta(seconds=duration_seconds)
        if last_activity_at > end_time:
            last_activity_at = end_time
            duration_seconds = int((last_activity_at - started_at).total_seconds())

        country, city = random.choice(LOCATIONS)
        term_reasons = ["manual_logout", "expired", "revoked", "timeout"]
        
        session = {
            "session_id": str(uuid.uuid4()),
            "user_id": user["user_id"],
            "ip_address": generate_ip(),
            "country": country,
            "city": city,
            "device_type": random.choice(device_types),
            "browser": random.choice(browsers),
            "os": random.choice(oses),
            "started_at": started_at.isoformat(),
            "last_activity_at": last_activity_at.isoformat(),
            "duration_seconds": duration_seconds,
            "is_active": is_active,
            "terminated_reason": None if is_active else random.choice(term_reasons)
        }
        sessions.append(session)

        if not user["last_login_at"] or datetime.fromisoformat(user["last_login_at"]) < started_at:
            user["last_login_at"] = started_at.isoformat()

        # Audit log for login
        audit_logs.append({
            "event_id": str(uuid.uuid4()),
            "user_id": user["user_id"],
            "action": "login_success",
            "target_user_id": None,
            "ip_address": session["ip_address"],
            "timestamp": started_at.isoformat(),
            "severity": "info"
        })

    # 3. Tokens
    # We distribute tokens primarily to sessions
    session_cycle = iter(sessions * (CONFIG["total_tokens"] // len(sessions) + 1))
    for _ in range(CONFIG["total_tokens"]):
        session = next(session_cycle)
        user = next(u for u in users if u["user_id"] == session["user_id"])
        
        t_type = random.choices(["access", "refresh"], [0.8, 0.2])[0]
        issued_at = datetime.fromisoformat(session["started_at"])
        if t_type == "access":
            expires_at = issued_at + timedelta(minutes=random.randint(15, 60))
        else:
            expires_at = issued_at + timedelta(days=random.randint(7, 30))

        is_revoked = random.random() < 0.10
        revoked_at = None
        if is_revoked:
            rev_delta = int((expires_at - issued_at).total_seconds() * random.random())
            revoked_at = issued_at + timedelta(seconds=rev_delta)
            audit_logs.append({
                "event_id": str(uuid.uuid4()),
                "user_id": user["user_id"],
                "action": "token_revoked",
                "target_user_id": None,
                "ip_address": session["ip_address"],
                "timestamp": revoked_at.isoformat(),
                "severity": "info"
            })

        token_id = str(uuid.uuid4())
        sig = hashlib.sha256(token_id.encode()).hexdigest()

        tokens.append({
            "token_id": token_id,
            "user_id": user["user_id"],
            "session_id": session["session_id"],
            "type": t_type,
            "issued_at": issued_at.isoformat(),
            "expires_at": expires_at.isoformat(),
            "revoked": is_revoked,
            "revoked_at": revoked_at.isoformat() if is_revoked else None,
            "scopes": user["permissions"],
            "signature_hash": sig
        })

    # 4. Requests & Anomalies
    endpoints = [
        "/api/auth/login", "/api/auth/logout", "/api/users", 
        "/api/users/{id}", "/api/analytics/report", 
        "/api/admin/audit", "/api/export/data"
    ]

    for i in range(CONFIG["total_requests"]):
        if i % 5000 == 0:
            print(f"Generated {i} requests...")

        # Inject anomaly sometimes
        is_anomaly = random.random() < 0.04
        anomaly_type = random.choice(["bruteforce", "token_reuse", "high_freq"]) if is_anomaly else None

        if anomaly_type == "bruteforce":
            # Simulate failed login
            ip = generate_ip()
            ts = weighted_timestamp(start_time, end_time)
            user = random.choice(users)
            requests.append({
                "request_id": str(uuid.uuid4()),
                "session_id": None,
                "token_id": None,
                "endpoint": "/api/auth/login",
                "method": "POST",
                "status_code": 401,
                "timestamp": ts.isoformat(),
                "response_time_ms": random.randint(10, 100),
                "request_size_bytes": random.randint(200, 500),
                "response_size_bytes": random.randint(500, 1000),
                "rate_limited": False,
                "error_message": "Invalid credentials"
            })
            audit_logs.append({
                "event_id": str(uuid.uuid4()),
                "user_id": user["user_id"],
                "action": "login_failed",
                "target_user_id": None,
                "ip_address": ip,
                "timestamp": ts.isoformat(),
                "severity": "warning"
            })
            continue

        session = random.choice(sessions)
        user = next(u for u in users if u["user_id"] == session["user_id"])
        
        # get access token for session
        sess_tokens = [t for t in tokens if t["session_id"] == session["session_id"] and t["type"] == "access"]
        token = random.choice(sess_tokens) if sess_tokens else None

        req_ts = rdate(datetime.fromisoformat(session["started_at"]), datetime.fromisoformat(session["last_activity_at"]))
        
        if anomaly_type == "token_reuse" and token and token["revoked"]:
            # Intentionally use revoked token
            req_ts = rdate(datetime.fromisoformat(token["revoked_at"]), end_time)

        # Basic properties
        ep = random.choice(endpoints)
        if user["role"] == "admin" and random.random() < 0.3:
            ep = "/api/admin/audit"
        elif user["role"] == "analyst" and random.random() < 0.3:
            ep = "/api/analytics/report"

        method = random.choice(["GET", "POST", "PUT", "PATCH", "DELETE"])
        status_code = random.choices([200, 201, 204, 400, 401, 403, 404, 429, 500, 503], 
                                     [50, 10, 12, 10, 0, 0, 8, 2, 5, 3])[0]
        
        rate_limited = status_code == 429
        if anomaly_type == "high_freq":
            status_code = 429
            rate_limited = True
            
        error_msg = None
        
        if not token:
            status_code = 401
            error_msg = "Missing token"
        else:
            # check token validity
            if token["revoked"] and req_ts > datetime.fromisoformat(token["revoked_at"]):
                status_code = 401
                error_msg = "Token revoked"
            elif req_ts > datetime.fromisoformat(token["expires_at"]):
                status_code = 401
                error_msg = "Token expired"
            else:
                # check permissions
                if ep == "/api/admin/audit" and "admin" not in user["permissions"]:
                    status_code = 403
                    error_msg = "Forbidden: lacking admin permission"
                elif ep == "/api/export/data" and "export" not in user["permissions"]:
                    status_code = 403
                    error_msg = "Forbidden: lacking export permission"
                    
        rt_ms = random.randint(10, 500)
        if status_code >= 500:
            rt_ms = random.randint(1000, 3000)

        requests.append({
            "request_id": str(uuid.uuid4()),
            "session_id": session["session_id"],
            "token_id": token["token_id"] if token else None,
            "endpoint": ep,
            "method": method,
            "status_code": status_code,
            "timestamp": req_ts.isoformat(),
            "response_time_ms": rt_ms,
            "request_size_bytes": random.randint(200, 5000),
            "response_size_bytes": random.randint(500, 20000),
            "rate_limited": rate_limited,
            "error_message": error_msg
        })

    print("Writing output to synthetic_saas_dataset.json...")
    with open("synthetic_saas_dataset.json", "w", encoding="utf-8") as f:
        json.dump({
            "users": users,
            "sessions": sessions,
            "tokens": tokens,
            "requests": requests,
            "audit_logs": audit_logs
        }, f, indent=2)
    print("Done!")

if __name__ == "__main__":
    main()
