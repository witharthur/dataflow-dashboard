# Provectus Project: Detailed Technical Review

Reviewed on: 2026-03-04

## Scope
This document reviews the current codebase structure, architecture, runtime flow, setup process, and key risks based on static code inspection.

## Project Review Video
- Review recording: [review.mp4](./review.mp4)
- ![Image](https://github.com/user-attachments/assets/65ae0769-2e82-4e0c-b387-7057b13cd185)
## Repository Overview
Top-level contents:

- `backend/`: FastAPI + MongoDB analytics API (main application backend)
- `dashboard/`: React + Vite + TypeScript frontend dashboard
- `server/`: Separate Express + Mongoose service (minimal API)
- `claude_code_telemetry/`: Synthetic telemetry data generator + sample outputs
- `generate_saas_dataset.py`: Synthetic SaaS dataset generator
- `synthetic_saas_dataset.json`: Generated dataset used by loaders
- `review.mp4`, `ta.pdf`: non-code artifacts
- `requirements.txt`: root include file pointing to `backend/requirements.txt`

## High-Level Architecture
Primary flow in the current implementation:

1. Synthetic data is generated (`generate_saas_dataset.py` and/or `claude_code_telemetry/generate_fake_data.py`).
2. Data is loaded into MongoDB via:
   - `backend/load_data.py`
   - `backend/load_telemetry_data.py`
3. FastAPI service (`backend/main.py`) exposes analytics and dashboard endpoints.
4. React dashboard (`dashboard`) queries `/api/*` endpoints.
5. In development, Vite proxies `/api` to `http://localhost:8000`.

## Component Review

### 1) `backend/` (FastAPI)
Status: Core backend and most complete service.

Key characteristics:

- Async FastAPI app with Motor (MongoDB async driver).
- Startup lifecycle creates indexes for collections (`users`, `sessions`, `events`, `userActivity`, `calendar`).
- CORS configured for local frontend origins.
- Good endpoint coverage for analytics and dashboard features.

Main endpoint groups:

- Health: `/health`
- Analytics: `/api/overview`, `/api/tokens-by-role`, `/api/events-over-time`, `/api/event-type-distribution`, `/api/peak-hours`, `/api/top-languages`, `/api/error-analysis`
- Sessions: `/api/sessions`, `/api/sessions/{session_id}`
- Dashboard workflow: `/api/dashboard/analytics`, `/api/dashboard/users`, `/api/dashboard/user-activity` (GET/POST), `/api/dashboard/check-date-range`, `/api/dashboard/calendar`

Strengths:

- Clear API segmentation by domain.
- Consistent MongoDB aggregation usage.
- Useful input validation with Pydantic and query constraints.

Risks / gaps:

- Mixed document shapes in `users` collection (`user_id` and `userId`) increase complexity.
- No visible authentication/authorization on endpoints.
- Startup index creation every boot is convenient but can slow startup in larger deployments.
- No dedicated test suite in backend folder.

### 2) `dashboard/` (React + Vite)
Status: Functional UI consuming backend APIs.

Key characteristics:

- React app with React Router and TanStack Query.
- API client in `src/lib/api.ts` with typed responses.
- Vite dev server on port `8080`, proxying `/api` to `http://localhost:8000`.
- Uses shadcn/ui style component set.

Strengths:

- Type-safe API models and centralized data fetch layer.
- Reasonable page split (`Overview`, `EventAnalytics`, `Sessions`, `SessionDetail`).

Risks / gaps:

- `dashboard/README.md` still contains Lovable template placeholders (`REPLACE_WITH_PROJECT_ID`).
- `dashboard/index.html` still has generic TODO metadata (`Lovable App` title/og tags).
- Test presence appears minimal (`src/test/example.test.ts`), likely not covering core flows.

### 3) `server/` (Express)
Status: Minimal separate service; appears secondary or legacy.

Key characteristics:

- Express app with Mongo connection and only root route `/`.
- Uses `MONGO_URI` and runs on `PORT` (default `5000`).

Risks / gaps:

- No business endpoints beyond health-like root response.
- Overlaps conceptually with FastAPI backend, creating architectural ambiguity.
- If `MONGO_URI` is missing, process exits.

Recommendation:

- Decide whether this service is required. If not, archive/remove to reduce confusion.

### 4) Data generation + ingestion tooling
Status: Useful for demo/testing data.

Key files:

- `generate_saas_dataset.py`
- `synthetic_saas_dataset.json`
- `claude_code_telemetry/generate_fake_data.py`
- `backend/load_data.py`
- `backend/load_telemetry_data.py`

Strengths:

- Supports multiple seed data formats (JSON and telemetry JSONL/CSV).
- Upsert-based loading reduces duplicate record issues.

Risks / gaps:

- Large generated dataset committed in repo can bloat history.
- Data schema translation logic is complex and currently untested.

## Runtime and Setup

## Prerequisites

- Python 3.10+
- Node.js 18+
- MongoDB

## Backend (FastAPI)

```bash
cd backend
pip install -r requirements.txt
python -m uvicorn main:app --host 0.0.0.0 --port 8000
```

## Frontend (Dashboard)

```bash
cd dashboard
npm install
npm run dev -- --host 0.0.0.0 --port 8080
```

Open: `http://localhost:8080`

## Optional Express service

```bash
cd server
npm install
npm run dev
```

## Environment Variables

Backend (`backend/.env` expected):

- `MONGO_URL` (default: `mongodb://localhost:27017`)
- `DB_NAME` (default: `claude_analytics`)
- `CORS_ORIGIN_1`, `CORS_ORIGIN_2` (optional)

Server (`server/.env` expected):

- `MONGO_URI` (required by Express service)
- `PORT` (optional, default `5000`)

Dashboard:

- `VITE_API_URL` (optional). If unset, Vite proxy handles `/api` in dev.

## What Is Working Well

- End-to-end analytics flow exists from data generation to visualization.
- FastAPI backend provides broad analytics endpoints.
- Frontend and backend local dev integration is configured and functional.

## Key Issues To Address

1. Service ownership ambiguity
   The repo has both FastAPI and Express backends; only one should be primary for maintainability.

2. Documentation quality
   Frontend docs and HTML metadata still use scaffolding placeholders.

3. Testing depth
   Backend tests are missing; frontend tests appear minimal.

4. Repository hygiene
   Generated artifacts and non-source files in root suggest cleanup is needed.

5. Security hardening
   No auth/authz layer observed on analytics/dashboard APIs.

## Prioritized Recommendations

P0 (Immediate)

- Choose one backend runtime (FastAPI recommended based on completeness).
- Replace placeholder metadata/docs in `dashboard`.
- Add `.gitignore` at root for generated artifacts and caches.

P1 (Near term)

- Add backend automated tests for aggregations and date-range logic.
- Add frontend integration tests for core pages and filters.
- Introduce API auth strategy (JWT/session/service-token depending on product needs).

P2 (Medium term)

- Define and document a stable schema contract for Mongo collections.
- Add CI workflow for lint/test/build.
- Consider monorepo task runner (`Makefile`, npm workspaces, or similar).

## Suggested Next Milestone
Create a single source of truth architecture by:

1. Deprecating or integrating `server/`.
2. Documenting canonical startup commands in this root README.
3. Adding test coverage for `/api/dashboard/analytics` and `/api/sessions` first.
