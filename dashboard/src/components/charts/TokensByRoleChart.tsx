import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ResponsiveContainer } from "recharts";
import { fetchTokensByRole, TokensByRole } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";

const COLORS = ["#00d4ff", "#ffb300", "#a78bfa", "#34d399", "#f87171"];

export default function TokensByRoleChart() {
    const [data, setData] = useState<TokensByRole[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchTokensByRole().then(setData).finally(() => setLoading(false));
    }, []);

    if (loading) return <Skeleton className="h-48 w-full" />;

    return (
        <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data} layout="vertical" margin={{ top: 0, right: 30, left: 60, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                <XAxis
                    type="number"
                    tick={{ fill: "#6b7280", fontSize: 10, fontFamily: "monospace" }}
                    axisLine={false}
                    tickLine={false}
                />
                <YAxis
                    type="category"
                    dataKey="role"
                    tick={{ fill: "#9ca3af", fontSize: 11, fontFamily: "monospace" }}
                    axisLine={false}
                    tickLine={false}
                    width={80}
                />
                <Tooltip
                    contentStyle={{
                        background: "#1a1f2e",
                        border: "1px solid #2a2f3e",
                        borderRadius: 4,
                        fontSize: 11,
                        fontFamily: "monospace",
                    }}
                    formatter={(value: number, _name: string, props: { payload?: TokensByRole }) => [
                        `${value.toLocaleString()} tokens (avg: ${props.payload?.avg_tokens?.toFixed(0) ?? "—"})`,
                        "Total",
                    ]}
                    labelStyle={{ color: "#9ca3af" }}
                />
                <Bar dataKey="total_tokens" radius={[0, 2, 2, 0]} maxBarSize={22}>
                    {data.map((_, idx) => (
                        <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                    ))}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
}
