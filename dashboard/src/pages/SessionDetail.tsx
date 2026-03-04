import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchSessionDetail, SessionDetail } from "@/lib/api";
import SessionTimeline from "@/components/SessionTimeline";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft } from "lucide-react";

function fmt(sec: number) {
    const m = Math.floor(sec / 60);
    const h = Math.floor(m / 60);
    if (h > 0) return `${h}h ${m % 60}m`;
    return `${m}m`;
}

function MetaItem({ label, value }: { label: string; value: string | number | undefined }) {
    return (
        <div className="flex flex-col gap-0.5">
            <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">{label}</span>
            <span className="text-sm font-mono text-foreground">{value ?? "—"}</span>
        </div>
    );
}

export default function SessionDetailPage() {
    const { session_id } = useParams<{ session_id: string }>();
    const navigate = useNavigate();
    const [session, setSession] = useState<SessionDetail | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!session_id) return;
        setLoading(true);
        fetchSessionDetail(session_id).then(setSession).finally(() => setLoading(false));
    }, [session_id]);

    if (loading) {
        return (
            <div className="p-6 space-y-4 max-w-[1200px] mx-auto">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-36 w-full" />
                <Skeleton className="h-48 w-full" />
            </div>
        );
    }

    if (!session) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                <span className="text-4xl mb-3">✕</span>
                <p className="font-mono text-sm">Session not found</p>
            </div>
        );
    }

    const tokenChartData = (session.events ?? []).map((e) => ({
        seq: e.sequence_num,
        tokens: e.total_tokens,
    }));

    return (
        <div className="flex flex-col gap-6 p-6 max-w-[1200px] w-full mx-auto">
            {/* Back button */}
            <button
                onClick={() => navigate("/sessions")}
                className="flex items-center gap-2 text-xs font-mono text-muted-foreground hover:text-primary transition-colors w-fit"
            >
                <ArrowLeft size={13} /> Back to Sessions
            </button>

            {/* Header */}
            <div>
                <p className="section-title">Session Detail</p>
                <h1 className="text-sm font-mono font-bold text-primary break-all">{session.session_id}</h1>
            </div>

            {/* Metadata Card */}
            <div className="chart-card grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-4">
                <MetaItem label="User ID" value={session.user_id?.slice(0, 12) + "…"} />
                <MetaItem label="Role" value={session.role} />
                <MetaItem label="Project" value={session.project_type} />
                <MetaItem label="Language" value={session.primary_language} />
                <MetaItem label="OS" value={session.os} />
                <MetaItem label="Editor" value={session.editor} />
                <MetaItem label="Claude Ver." value={session.claude_version} />
                <MetaItem label="Duration" value={fmt(session.duration_seconds ?? 0)} />
                <MetaItem label="Started" value={session.started_at ? new Date(session.started_at).toLocaleString() : "—"} />
                <MetaItem label="Ended" value={session.ended_at ? new Date(session.ended_at).toLocaleString() : "—"} />
            </div>

            {/* Token usage mini-chart */}
            {tokenChartData.length > 0 && (
                <div className="chart-card">
                    <p className="section-title">Token Consumption per Event</p>
                    <ResponsiveContainer width="100%" height={160}>
                        <LineChart data={tokenChartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                            <XAxis dataKey="seq" tick={{ fill: "#6b7280", fontSize: 10, fontFamily: "monospace" }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fill: "#6b7280", fontSize: 10, fontFamily: "monospace" }} axisLine={false} tickLine={false} width={36} />
                            <Tooltip
                                contentStyle={{ background: "#1a1f2e", border: "1px solid #2a2f3e", borderRadius: 4, fontSize: 11, fontFamily: "monospace" }}
                                itemStyle={{ color: "#00d4ff" }}
                                labelStyle={{ color: "#9ca3af" }}
                                labelFormatter={(v) => `Event #${v}`}
                            />
                            <Line type="monotone" dataKey="tokens" stroke="#00d4ff" strokeWidth={2} dot={false} activeDot={{ r: 3, fill: "#00d4ff" }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* Events Timeline */}
            <div className="chart-card">
                <p className="section-title">Events Timeline · {session.events?.length ?? 0} events</p>
                <SessionTimeline events={session.events ?? []} />
            </div>
        </div>
    );
}
