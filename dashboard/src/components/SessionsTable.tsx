import { Session } from "@/lib/api";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
    sessions: Session[];
    total: number;
    page: number;
    limit: number;
    loading: boolean;
    onPageChange: (p: number) => void;
}

function fmt(sec: number) {
    const m = Math.floor(sec / 60);
    const h = Math.floor(m / 60);
    if (h > 0) return `${h}h ${m % 60}m`;
    return `${m}m`;
}

function badge(text: string, color: string) {
    return (
        <span className={cn(
            "inline-block px-1.5 py-0.5 rounded text-[10px] font-mono uppercase tracking-wide border",
            color
        )}>
            {text}
        </span>
    );
}

const ROLE_COLORS: Record<string, string> = {
    tech_lead: "text-primary border-primary/30 bg-primary/10",
    senior_dev: "text-amber-400 border-amber-400/30 bg-amber-400/10",
    junior_dev: "text-purple-400 border-purple-400/30 bg-purple-400/10",
    data_scientist: "text-emerald-400 border-emerald-400/30 bg-emerald-400/10",
    devops: "text-red-400 border-red-400/30 bg-red-400/10",
};

export default function SessionsTable({ sessions, total, page, limit, loading, onPageChange }: Props) {
    const navigate = useNavigate();
    const pages = Math.ceil(total / limit);

    if (loading) {
        return (
            <div className="space-y-2">
                {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
        );
    }

    if (!sessions.length) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <span className="text-4xl mb-3">◈</span>
                <p className="font-mono text-sm">No sessions found</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-3">
            <div className="overflow-x-auto rounded border border-border">
                <table className="w-full text-xs font-mono">
                    <thead>
                        <tr className="border-b border-border bg-secondary/50">
                            {["Session ID", "Role", "Project", "Language", "Duration", "Events", "Version", "Started"].map((h) => (
                                <th key={h} className="text-left px-3 py-2.5 text-muted-foreground font-normal tracking-wider uppercase text-[10px]">
                                    {h}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {sessions.map((s, i) => (
                            <tr
                                key={s.session_id}
                                onClick={() => navigate(`/sessions/${s.session_id}`)}
                                className={cn(
                                    "border-b border-border/50 cursor-pointer transition-colors",
                                    i % 2 === 0 ? "bg-card" : "bg-secondary/20",
                                    "hover:bg-primary/5 hover:border-primary/20"
                                )}
                            >
                                <td className="px-3 py-2.5 text-muted-foreground">{s.session_id.slice(0, 8)}…</td>
                                <td className="px-3 py-2.5">{badge(s.role ?? "—", ROLE_COLORS[s.role] ?? "text-muted-foreground border-border bg-secondary")}</td>
                                <td className="px-3 py-2.5 text-foreground">{s.project_type ?? "—"}</td>
                                <td className="px-3 py-2.5 text-primary">{s.primary_language ?? "—"}</td>
                                <td className="px-3 py-2.5 text-foreground">{fmt(s.duration_seconds ?? 0)}</td>
                                <td className="px-3 py-2.5 text-amber-400">{s.n_events ?? 0}</td>
                                <td className="px-3 py-2.5 text-muted-foreground">{s.claude_version ?? "—"}</td>
                                <td className="px-3 py-2.5 text-muted-foreground">
                                    {s.started_at ? new Date(s.started_at).toLocaleDateString() : "—"}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between text-xs font-mono text-muted-foreground px-1">
                <span>{total.toLocaleString()} total · page {page} of {pages}</span>
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => onPageChange(page - 1)}
                        disabled={page <= 1}
                        className="p-1.5 rounded border border-border hover:border-primary/40 hover:text-primary disabled:opacity-30 transition-colors"
                    >
                        <ChevronLeft size={12} />
                    </button>
                    {Array.from({ length: Math.min(pages, 5) }, (_, i) => {
                        const p = i + 1;
                        return (
                            <button
                                key={p}
                                onClick={() => onPageChange(p)}
                                className={cn(
                                    "px-2 py-1 rounded border transition-colors",
                                    p === page
                                        ? "border-primary bg-primary/10 text-primary"
                                        : "border-border hover:border-primary/40 hover:text-primary"
                                )}
                            >
                                {p}
                            </button>
                        );
                    })}
                    <button
                        onClick={() => onPageChange(page + 1)}
                        disabled={page >= pages}
                        className="p-1.5 rounded border border-border hover:border-primary/40 hover:text-primary disabled:opacity-30 transition-colors"
                    >
                        <ChevronRight size={12} />
                    </button>
                </div>
            </div>
        </div>
    );
}
