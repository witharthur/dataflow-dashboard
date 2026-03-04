import { useEffect, useState } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { fetchEventsOverTime, EventsOverTime } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
    startDate?: string;
    endDate?: string;
}

export default function EventsOverTimeChart({ startDate, endDate }: Props) {
    const [data, setData] = useState<EventsOverTime[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        fetchEventsOverTime(startDate, endDate)
            .then(setData)
            .finally(() => setLoading(false));
    }, [startDate, endDate]);

    if (loading) return <Skeleton className="h-64 w-full" />;

    return (
        <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                    <linearGradient id="evtGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#00d4ff" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#00d4ff" stopOpacity={0} />
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis
                    dataKey="date"
                    tick={{ fill: "#6b7280", fontSize: 10, fontFamily: "monospace" }}
                    tickFormatter={(v) => v.slice(5)}
                    axisLine={false}
                    tickLine={false}
                />
                <YAxis
                    tick={{ fill: "#6b7280", fontSize: 10, fontFamily: "monospace" }}
                    axisLine={false}
                    tickLine={false}
                    width={36}
                />
                <Tooltip
                    contentStyle={{
                        background: "#1a1f2e",
                        border: "1px solid #2a2f3e",
                        borderRadius: 4,
                        fontSize: 11,
                        fontFamily: "monospace",
                    }}
                    labelStyle={{ color: "#9ca3af" }}
                    itemStyle={{ color: "#00d4ff" }}
                />
                <Area
                    type="monotone"
                    dataKey="count"
                    stroke="#00d4ff"
                    strokeWidth={2}
                    fill="url(#evtGrad)"
                    dot={false}
                    activeDot={{ r: 4, fill: "#00d4ff", strokeWidth: 0 }}
                />
            </AreaChart>
        </ResponsiveContainer>
    );
}
