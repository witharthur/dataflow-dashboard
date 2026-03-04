import { SessionEvent } from "@/lib/api";
import { cn } from "@/lib/utils";

interface Props {
    events: SessionEvent[];
}

const TYPE_COLOR: Record<string, string> = {
    code_generation: "text-primary border-primary/30 bg-primary/10",
    bug_fix: "text-amber-400 border-amber-400/30 bg-amber-400/10",
    explanation: "text-purple-400 border-purple-400/30 bg-purple-400/10",
    refactoring: "text-emerald-400 border-emerald-400/30 bg-emerald-400/10",
    test_generation: "text-blue-400 border-blue-400/30 bg-blue-400/10",
    documentation: "text-pink-400 border-pink-400/30 bg-pink-400/10",
};

export default function SessionTimeline({ events }: Props) {
    if (!events.length) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <span className="text-3xl mb-2">○</span>
                <p className="font-mono text-sm">No events</p>
            </div>
        );
    }

    return (
        <div className="relative space-y-0">
            {/* vertical line */}
            <div className="absolute left-[18px] top-0 bottom-0 w-px bg-border" />

            {events.map((ev, idx) => (
                <div key={ev.event_id ?? idx} className="relative flex gap-4 pl-10 pb-4 group">
                    {/* Dot */}
                    <div className={cn(
                        "absolute left-3.5 top-1.5 w-2.5 h-2.5 rounded-full border-2 transition-all",
                        ev.success
                            ? "border-primary bg-primary/20 group-hover:bg-primary/40"
                            : "border-red-400 bg-red-400/20 group-hover:bg-red-400/40"
                    )} style={{ transform: "translateX(-50%)" }} />

                    {/* Card */}
                    <div className="flex-1 bg-secondary/30 border border-border rounded p-3 hover:border-border/70 transition-colors">
                        <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-mono text-muted-foreground">#{ev.sequence_num}</span>
                                <span className={cn(
                                    "inline-block px-1.5 py-0.5 rounded text-[10px] font-mono uppercase tracking-wide border",
                                    TYPE_COLOR[ev.event_type] ?? "text-muted-foreground border-border bg-card"
                                )}>
                                    {ev.event_type?.replace(/_/g, " ")}
                                </span>
                            </div>
                            <div className="flex items-center gap-3 text-[10px] font-mono text-muted-foreground">
                                <span>{ev.timestamp ? new Date(ev.timestamp).toLocaleTimeString() : "—"}</span>
                                <span className={ev.success ? "text-emerald-400" : "text-red-400"}>
                                    {ev.success ? "✓ ok" : `✕ ${ev.error_type ?? "err"}`}
                                </span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1 text-[10px] font-mono">
                            <div>
                                <span className="text-muted-foreground">in: </span>
                                <span className="text-primary">{ev.input_tokens?.toLocaleString()}</span>
                            </div>
                            <div>
                                <span className="text-muted-foreground">out: </span>
                                <span className="text-amber-400">{ev.output_tokens?.toLocaleString()}</span>
                            </div>
                            <div>
                                <span className="text-muted-foreground">total: </span>
                                <span className="text-foreground">{ev.total_tokens?.toLocaleString()}</span>
                            </div>
                            <div>
                                <span className="text-muted-foreground">latency: </span>
                                <span className="text-foreground">{ev.latency_ms}ms</span>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
