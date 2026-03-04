import { useEffect, useState } from "react";
import { fetchSessions, Session, SessionsResponse } from "@/lib/api";
import SessionsTable from "@/components/SessionsTable";
import { useDateRange } from "@/context/DateRangeContext";

const ROLES = ["", "junior_dev", "senior_dev", "tech_lead", "data_scientist", "devops"];
const PROJECTS = ["", "web_app", "api_service", "data_pipeline", "cli_tool", "infrastructure"];

export default function Sessions() {
    const { dateRange } = useDateRange();
    const [data, setData] = useState<SessionsResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [role, setRole] = useState("");

    useEffect(() => {
        setLoading(true);
        fetchSessions({
            page,
            limit: 20,
            role: role || undefined,
            start_date: dateRange.startDate,
            end_date: dateRange.endDate,
        })
            .then(setData)
            .finally(() => setLoading(false));
    }, [page, role, dateRange]);

    // Reset to page 1 when filters change
    useEffect(() => { setPage(1); }, [role, dateRange]);

    return (
        <div className="flex flex-col gap-5 p-6 max-w-[1400px] w-full mx-auto">
            <div>
                <p className="section-title">Sessions Explorer</p>
                <h1 className="text-xl font-mono font-bold text-foreground">All Sessions</h1>
            </div>

            {/* Filter bar */}
            <div className="flex flex-wrap items-center gap-3 p-4 rounded border border-border bg-card">
                <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Filters</span>

                <div className="flex items-center gap-2">
                    <label className="text-xs font-mono text-muted-foreground">Role</label>
                    <select
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        className="bg-secondary border border-border rounded px-2 py-1 text-xs font-mono text-foreground focus:outline-none focus:border-primary/50 transition-colors"
                    >
                        {ROLES.map((r) => <option key={r} value={r}>{r || "All Roles"}</option>)}
                    </select>
                </div>

                {(role || dateRange.startDate || dateRange.endDate) && (
                    <button
                        onClick={() => { setRole(""); }}
                        className="text-xs font-mono text-muted-foreground hover:text-primary transition-colors"
                    >
                        ✕ clear filters
                    </button>
                )}

                {data && (
                    <span className="ml-auto text-xs font-mono text-muted-foreground">
                        {data.total.toLocaleString()} sessions
                    </span>
                )}
            </div>

            {/* Table */}
            <SessionsTable
                sessions={data?.sessions ?? []}
                total={data?.total ?? 0}
                page={page}
                limit={20}
                loading={loading}
                onPageChange={setPage}
            />
        </div>
    );
}
