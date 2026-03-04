import { useEffect, useRef, useState } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
    label: string;
    value: number;
    format?: "number" | "percent" | "tokens";
    trend?: "up" | "down" | "neutral";
    prefix?: string;
    suffix?: string;
    className?: string;
}

function useCountUp(target: number, duration = 1200) {
    const [value, setValue] = useState(0);
    const frame = useRef<number | null>(null);

    useEffect(() => {
        if (target === 0) { setValue(0); return; }
        const start = performance.now();
        const animate = (now: number) => {
            const progress = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setValue(Math.round(eased * target));
            if (progress < 1) frame.current = requestAnimationFrame(animate);
        };
        frame.current = requestAnimationFrame(animate);
        return () => { if (frame.current) cancelAnimationFrame(frame.current); };
    }, [target, duration]);

    return value;
}

export default function KpiCard({ label, value, format = "number", trend, prefix, suffix, className }: Props) {
    const animated = useCountUp(value);

    const formatted = (() => {
        if (format === "percent") return `${animated.toFixed ? animated : animated}%`;
        if (format === "tokens") {
            if (animated >= 1_000_000) return `${(animated / 1_000_000).toFixed(1)}M`;
            if (animated >= 1_000) return `${(animated / 1_000).toFixed(1)}K`;
            return animated.toLocaleString();
        }
        return animated.toLocaleString();
    })();

    return (
        <div className={cn("kpi-card flex flex-col gap-2 select-none", className)}>
            <p className="section-title mb-0">{label}</p>
            <div className="flex items-end gap-2 mt-1">
                {prefix && <span className="text-muted-foreground text-sm font-mono mb-0.5">{prefix}</span>}
                <span className="text-3xl font-bold font-mono text-foreground leading-none tracking-tight">
                    {formatted}
                </span>
                {suffix && <span className="text-muted-foreground text-sm font-mono mb-0.5">{suffix}</span>}
            </div>
            {trend && trend !== "neutral" && (
                <div className={cn(
                    "flex items-center gap-1 text-xs font-mono",
                    trend === "up" ? "text-emerald-400" : "text-red-400"
                )}>
                    {trend === "up" ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                    <span>{trend === "up" ? "↑ vs prior" : "↓ vs prior"}</span>
                </div>
            )}
        </div>
    );
}
