import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ResponsiveContainer } from "recharts";
import { fetchPeakHours, PeakHourItem } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";

const BUSINESS_HOURS = (h: number) => h >= 9 && h <= 18;

export default function PeakHoursChart() {
    const [data, setData] = useState<PeakHourItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPeakHours().then(setData).finally(() => setLoading(false));
    }, []);

    if (loading) return <Skeleton className="h-48 w-full" />;

    return (
        <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data} margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis
                    dataKey="hour"
                    tick={{ fill: "#6b7280", fontSize: 9, fontFamily: "monospace" }}
                    tickFormatter={(h) => `${h}h`}
                    axisLine={false}
                    tickLine={false}
                />
                <YAxis
                    tick={{ fill: "#6b7280", fontSize: 9, fontFamily: "monospace" }}
                    axisLine={false}
                    tickLine={false}
                    width={30}
                />
                <Tooltip
                    contentStyle={{
                        background: "#1a1f2e",
                        border: "1px solid #2a2f3e",
                        borderRadius: 4,
                        fontSize: 11,
                        fontFamily: "monospace",
                    }}
                    labelFormatter={(h) => `Hour ${h}:00`}
                    itemStyle={{ color: "#00d4ff" }}
                    labelStyle={{ color: "#9ca3af" }}
                />
                <Bar dataKey="count" maxBarSize={16} radius={[2, 2, 0, 0]}>
                    {data.map((entry, idx) => (
                        <Cell
                            key={idx}
                            fill={BUSINESS_HOURS(entry.hour) ? "#00d4ff" : "#2a3045"}
                        />
                    ))}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
}
