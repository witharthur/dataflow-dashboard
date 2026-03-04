import { useEffect, useState } from "react";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { fetchEventTypeDistribution, EventTypeItem } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";

const COLORS = ["#00d4ff", "#ffb300", "#a78bfa", "#34d399", "#f87171", "#60a5fa", "#fb923c"];

interface Props {
    onSelect?: (eventType: string | null) => void;
}

export default function EventTypeDonut({ onSelect }: Props) {
    const [data, setData] = useState<EventTypeItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [active, setActive] = useState<string | null>(null);

    useEffect(() => {
        fetchEventTypeDistribution()
            .then((raw) => {
                const total = raw.reduce((s, d) => s + d.count, 0);
                setData(raw.map((d) => ({ ...d, percentage: Math.round((d.count / total) * 100) })));
            })
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <Skeleton className="h-64 w-full" />;

    const handleClick = (entry: EventTypeItem) => {
        const next = active === entry.event_type ? null : entry.event_type;
        setActive(next);
        onSelect?.(next);
    };

    return (
        <ResponsiveContainer width="100%" height={280}>
            <PieChart>
                <Pie
                    data={data}
                    cx="50%"
                    cy="45%"
                    innerRadius={65}
                    outerRadius={100}
                    dataKey="count"
                    nameKey="event_type"
                    paddingAngle={2}
                    onClick={(_d, _i, e) => {
                        const target = data.find(d => d.event_type === (_d as EventTypeItem).event_type);
                        if (target) { handleClick(target); e.stopPropagation(); }
                    }}
                    label={({ event_type, percentage }) => `${percentage}%`}
                    labelLine={false}
                >
                    {data.map((entry, idx) => (
                        <Cell
                            key={idx}
                            fill={COLORS[idx % COLORS.length]}
                            opacity={active && active !== entry.event_type ? 0.35 : 1}
                            style={{ cursor: "pointer" }}
                        />
                    ))}
                </Pie>
                <Tooltip
                    contentStyle={{
                        background: "#1a1f2e",
                        border: "1px solid #2a2f3e",
                        borderRadius: 4,
                        fontSize: 11,
                        fontFamily: "monospace",
                    }}
                    formatter={(v: number, name: string) => [`${v.toLocaleString()} events`, name]}
                    labelStyle={{ color: "#9ca3af" }}
                />
                <Legend
                    iconType="circle"
                    iconSize={8}
                    formatter={(value) => (
                        <span style={{ color: "#9ca3af", fontSize: 11, fontFamily: "monospace" }}>{value}</span>
                    )}
                />
            </PieChart>
        </ResponsiveContainer>
    );
}
