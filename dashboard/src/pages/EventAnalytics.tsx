import { useEffect, useState } from "react";
import {
    fetchEventTypeDistribution, fetchTopLanguages, fetchErrorAnalysis,
    EventTypeItem, TopLanguage, ErrorAnalysis,
} from "@/lib/api";
import EventTypeDonut from "@/components/charts/EventTypeDonut";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ResponsiveContainer } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

const COLORS = ["#00d4ff", "#ffb300", "#a78bfa", "#34d399", "#f87171", "#60a5fa", "#fb923c"];

export default function EventAnalytics() {
    const [_activeType, setActiveType] = useState<string | null>(null);
    const [langs, setLangs] = useState<TopLanguage[]>([]);
    const [errs, setErrs] = useState<ErrorAnalysis | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([fetchTopLanguages(), fetchErrorAnalysis()])
            .then(([l, e]) => { setLangs(l); setErrs(e); })
            .finally(() => setLoading(false));
    }, []);

    return (
        <div className="flex flex-col gap-6 p-6 max-w-[1400px] w-full mx-auto">
            <div>
                <p className="section-title">Event Analytics</p>
                <h1 className="text-xl font-mono font-bold text-foreground">Event Patterns & Errors</h1>
            </div>

            {/* Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="chart-card">
                    <p className="section-title">Event Type Distribution</p>
                    <EventTypeDonut onSelect={setActiveType} />
                </div>

                <div className="chart-card">
                    <p className="section-title">Top Languages by Token Usage</p>
                    {loading ? <Skeleton className="h-64 w-full" /> : (
                        <ResponsiveContainer width="100%" height={260}>
                            <BarChart data={langs} margin={{ top: 5, right: 10, left: 0, bottom: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                <XAxis
                                    dataKey="language"
                                    tick={{ fill: "#6b7280", fontSize: 10, fontFamily: "monospace" }}
                                    axisLine={false} tickLine={false}
                                    angle={-35} textAnchor="end"
                                />
                                <YAxis
                                    tick={{ fill: "#6b7280", fontSize: 10, fontFamily: "monospace" }}
                                    axisLine={false} tickLine={false} width={40}
                                />
                                <Tooltip
                                    contentStyle={{ background: "#1a1f2e", border: "1px solid #2a2f3e", borderRadius: 4, fontSize: 11, fontFamily: "monospace" }}
                                    formatter={(v: number) => [v.toLocaleString(), "tokens"]}
                                    labelStyle={{ color: "#9ca3af" }}
                                />
                                <Bar dataKey="total_tokens" radius={[3, 3, 0, 0]} maxBarSize={30}>
                                    {langs.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>

            {/* Error Analysis */}
            <div className="chart-card">
                <p className="section-title">Error Analysis</p>
                {loading || !errs ? <Skeleton className="h-40 w-full" /> : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Big stat */}
                        <div className="flex flex-col gap-1 justify-center">
                            <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Overall Error Rate</span>
                            <span className="text-5xl font-mono font-bold text-red-400">{errs.error_rate}%</span>
                            <span className="text-xs font-mono text-muted-foreground">{errs.total_errors.toLocaleString()} total errors</span>
                        </div>
                        {/* Bar chart */}
                        <div className="md:col-span-2">
                            <ResponsiveContainer width="100%" height={180}>
                                <BarChart data={errs.errors_by_type} layout="vertical" margin={{ top: 0, right: 10, left: 80, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                                    <XAxis type="number" tick={{ fill: "#6b7280", fontSize: 10, fontFamily: "monospace" }} axisLine={false} tickLine={false} />
                                    <YAxis type="category" dataKey="error_type" tick={{ fill: "#9ca3af", fontSize: 10, fontFamily: "monospace" }} axisLine={false} tickLine={false} width={90} />
                                    <Tooltip
                                        contentStyle={{ background: "#1a1f2e", border: "1px solid #2a2f3e", borderRadius: 4, fontSize: 11, fontFamily: "monospace" }}
                                        labelStyle={{ color: "#9ca3af" }}
                                        itemStyle={{ color: "#f87171" }}
                                    />
                                    <Bar dataKey="count" fill="#f87171" radius={[0, 3, 3, 0]} maxBarSize={16} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
