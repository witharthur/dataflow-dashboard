import { toast } from "sonner";

export const API_BASE = import.meta.env.VITE_API_URL || "";

async function apiFetch<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T> {
    const base = API_BASE || window.location.origin;
    const url = new URL(`${base}${path}`);
    if (params) {
        Object.entries(params).forEach(([k, v]) => {
            if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
        });
    }
    try {
        const res = await fetch(url.toString());
        if (!res.ok) {
            const err = await res.text();
            throw new Error(`API ${res.status}: ${err}`);
        }
        return res.json() as Promise<T>;
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Unknown API error";
        toast.error(`API Error: ${msg}`);
        throw e;
    }
}

// ── Types ────────────────────────────────────────────────────────────────────
export interface OverviewData {
    total_sessions: number;
    total_events: number;
    total_users: number;
    total_tokens: number;
    input_tokens: number;
    output_tokens: number;
    success_rate: number;
}

export interface TokensByRole {
    role: string;
    total_tokens: number;
    avg_tokens: number;
    event_count: number;
}

export interface EventsOverTime {
    date: string;
    count: number;
}

export interface EventTypeItem {
    event_type: string;
    count: number;
    percentage?: number;
}

export interface PeakHourItem {
    hour: number;
    count: number;
}

export interface TopLanguage {
    language: string;
    total_tokens: number;
    event_count: number;
}

export interface ErrorAnalysis {
    error_rate: number;
    total_errors: number;
    errors_by_type: { error_type: string; count: number }[];
}

export interface Session {
    session_id: string;
    user_id: string;
    role: string;
    project_type: string;
    primary_language: string;
    started_at: string;
    ended_at: string;
    duration_seconds: number;
    n_events: number;
    os: string;
    editor: string;
    claude_version: string;
}

export interface SessionsResponse {
    sessions: Session[];
    total: number;
    page: number;
    limit: number;
}

export interface SessionEvent {
    event_id: string;
    session_id: string;
    event_type: string;
    timestamp: string;
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
    latency_ms: number;
    success: boolean;
    error_type: string | null;
    model: string;
    sequence_num: number;
}

export interface SessionDetail extends Session {
    events: SessionEvent[];
}

export interface DashboardAnalyticsData {
    active_users: number;
    session_count: number;
    average_session_duration: number;
    event_distribution: { event_type: string; count: number }[];
    department_activity: { department: string; event_count: number; active_users: number; session_count: number }[];
    department_options: string[];
    event_type_options: string[];
    applied_filters: {
        department?: string | null;
        event_type?: string | null;
        start_date?: string | null;
        end_date?: string | null;
    };
}

// ── API Functions ─────────────────────────────────────────────────────────────
export const fetchOverview = () =>
    apiFetch<OverviewData>("/api/overview");

export const fetchTokensByRole = () =>
    apiFetch<TokensByRole[]>("/api/tokens-by-role");

export const fetchEventsOverTime = (startDate?: string, endDate?: string) =>
    apiFetch<EventsOverTime[]>("/api/events-over-time", {
        start_date: startDate,
        end_date: endDate,
    });

export const fetchEventTypeDistribution = () =>
    apiFetch<EventTypeItem[]>("/api/event-type-distribution");

export const fetchPeakHours = () =>
    apiFetch<PeakHourItem[]>("/api/peak-hours");

export const fetchTopLanguages = (limit = 10) =>
    apiFetch<TopLanguage[]>("/api/top-languages", { limit });

export const fetchErrorAnalysis = () =>
    apiFetch<ErrorAnalysis>("/api/error-analysis");

export const fetchSessions = (params: {
    page?: number;
    limit?: number;
    role?: string;
    start_date?: string;
    end_date?: string;
}) => apiFetch<SessionsResponse>("/api/sessions", params as Record<string, string | number | undefined>);

export const fetchSessionDetail = (sessionId: string) =>
    apiFetch<SessionDetail>(`/api/sessions/${sessionId}`);

export const fetchDashboardAnalytics = (params: {
    department?: string;
    event_type?: string;
    start_date?: string;
    end_date?: string;
}) =>
    apiFetch<DashboardAnalyticsData>("/api/dashboard/analytics", params as Record<string, string | number | undefined>);
