import { NavLink } from "react-router-dom";
import { LayoutDashboard, Activity, List, ChevronLeft, ChevronRight, Zap } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const links = [
    { to: "/", label: "Overview", icon: LayoutDashboard, exact: true },
    { to: "/events", label: "Event Analytics", icon: Activity },
    { to: "/sessions", label: "Sessions", icon: List },
];

export default function Sidebar() {
    const [collapsed, setCollapsed] = useState(false);

    return (
        <aside
            className={cn(
                "flex flex-col bg-card border-r border-border transition-all duration-300 shrink-0",
                collapsed ? "w-16" : "w-56"
            )}
        >
            {/* Logo */}
            <div className={cn(
                "flex items-center gap-2.5 px-4 py-5 border-b border-border",
                collapsed ? "justify-center px-0" : ""
            )}>
                <div className="flex items-center justify-center w-8 h-8 rounded bg-primary/10 border border-primary/30 shrink-0">
                    <Zap size={14} className="text-primary" />
                </div>
                {!collapsed && (
                    <span className="text-sm font-semibold tracking-tight text-foreground font-mono leading-tight">
                        Claude<br />
                        <span className="text-primary">Analytics</span>
                    </span>
                )}
            </div>

            {/* Nav */}
            <nav className="flex-1 px-2 py-4 space-y-1">
                {links.map(({ to, label, icon: Icon, exact }) => (
                    <NavLink
                        key={to}
                        to={to}
                        end={exact}
                        className={({ isActive }) =>
                            cn(
                                "flex items-center gap-3 px-3 py-2.5 rounded text-sm transition-all duration-150 group",
                                collapsed ? "justify-center px-2" : "",
                                isActive
                                    ? "bg-primary/10 text-primary border border-primary/20"
                                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                            )
                        }
                    >
                        {({ isActive }) => (
                            <>
                                <Icon
                                    size={16}
                                    className={cn(
                                        "shrink-0 transition-colors",
                                        isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                                    )}
                                />
                                {!collapsed && (
                                    <span className="font-mono text-xs tracking-wide">{label}</span>
                                )}
                            </>
                        )}
                    </NavLink>
                ))}
            </nav>

            {/* Collapse Toggle */}
            <button
                onClick={() => setCollapsed(!collapsed)}
                className="flex items-center justify-center p-3 border-t border-border text-muted-foreground hover:text-foreground transition-colors"
            >
                {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </button>
        </aside>
    );
}
