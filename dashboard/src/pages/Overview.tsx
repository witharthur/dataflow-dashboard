import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import {
  fetchDashboardAnalytics,
  fetchOverview,
  type DashboardAnalyticsData,
  type OverviewData,
} from "@/lib/api";
import { useDateRange } from "@/context/DateRangeContext";
import KpiCard from "@/components/KpiCard";
import EventsOverTimeChart from "@/components/charts/EventsOverTimeChart";
import TokensByRoleChart from "@/components/charts/TokensByRoleChart";
import PeakHoursChart from "@/components/charts/PeakHoursChart";
import { Skeleton } from "@/components/ui/skeleton";

const BAR_COLORS = ["#00d4ff", "#34d399", "#ffb300", "#60a5fa", "#fb923c", "#a78bfa", "#f87171"];

function toStartIso(date?: string) {
  return date ? `${date}T00:00:00+00:00` : undefined;
}

function toEndIso(date?: string) {
  return date ? `${date}T23:59:59+00:00` : undefined;
}

export default function Overview() {
  const { dateRange } = useDateRange();
  const [kpis, setKpis] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);

  const [departmentFilter, setDepartmentFilter] = useState("");
  const [eventTypeFilter, setEventTypeFilter] = useState("");
  const [analytics, setAnalytics] = useState<DashboardAnalyticsData | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchOverview()
      .then(setKpis)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setAnalyticsLoading(true);
    fetchDashboardAnalytics({
      department: departmentFilter || undefined,
      event_type: eventTypeFilter || undefined,
      start_date: toStartIso(dateRange.startDate),
      end_date: toEndIso(dateRange.endDate),
    })
      .then(setAnalytics)
      .finally(() => setAnalyticsLoading(false));
  }, [dateRange.startDate, dateRange.endDate, departmentFilter, eventTypeFilter]);

  const eventDistributionData = useMemo(
    () => analytics?.event_distribution?.slice(0, 8) ?? [],
    [analytics],
  );
  const departmentActivityData = analytics?.department_activity ?? [];
  const avgSessionMinutes = Math.round((analytics?.average_session_duration ?? 0) / 60);

  return (
    <div className="flex flex-col gap-6 p-6 max-w-[1400px] w-full mx-auto">
      <div>
        <p className="section-title">Overview</p>
        <h1 className="text-xl font-mono font-bold text-foreground">Usage Dashboard</h1>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
        {loading || !kpis ? (
          Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-28" />)
        ) : (
          <>
            <KpiCard label="Total Sessions" value={kpis.total_sessions} trend="up" />
            <KpiCard label="Total Events" value={kpis.total_events} trend="up" />
            <KpiCard label="Total Tokens" value={kpis.total_tokens} format="tokens" trend="up" />
            <KpiCard label="Active Users" value={kpis.total_users} trend="neutral" />
            <KpiCard label="Success Rate" value={kpis.success_rate} format="percent" suffix="%" trend={kpis.success_rate >= 90 ? "up" : "down"} />
          </>
        )}
      </div>

      <div className="chart-card">
        <p className="section-title">Employee Activity Filters</p>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-muted-foreground">Department</span>
            <select
              value={departmentFilter}
              onChange={(event) => setDepartmentFilter(event.target.value)}
              className="bg-secondary border border-border rounded px-2 py-1 text-xs font-mono text-foreground focus:outline-none focus:border-primary/50 transition-colors"
            >
              <option value="">All</option>
              {(analytics?.department_options ?? []).map((department) => (
                <option key={department} value={department}>
                  {department}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-muted-foreground">Event Type</span>
            <select
              value={eventTypeFilter}
              onChange={(event) => setEventTypeFilter(event.target.value)}
              className="bg-secondary border border-border rounded px-2 py-1 text-xs font-mono text-foreground focus:outline-none focus:border-primary/50 transition-colors"
            >
              <option value="">All</option>
              {(analytics?.event_type_options ?? []).map((eventType) => (
                <option key={eventType} value={eventType}>
                  {eventType}
                </option>
              ))}
            </select>
          </div>

          {(departmentFilter || eventTypeFilter) && (
            <button
              onClick={() => {
                setDepartmentFilter("");
                setEventTypeFilter("");
              }}
              className="text-xs font-mono text-muted-foreground hover:text-primary transition-colors"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {analyticsLoading || !analytics ? (
          Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-24" />)
        ) : (
          <>
            <KpiCard label="Active Users (Filtered)" value={analytics.active_users} trend="up" />
            <KpiCard label="Session Count (Filtered)" value={analytics.session_count} trend="up" />
            <KpiCard label="Avg Session Duration" value={avgSessionMinutes} suffix="min" trend="neutral" />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="chart-card">
          <p className="section-title">Event Frequency</p>
          {analyticsLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={eventDistributionData} margin={{ top: 10, right: 8, left: 8, bottom: 24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis
                  dataKey="event_type"
                  tick={{ fill: "#6b7280", fontSize: 10, fontFamily: "monospace" }}
                  axisLine={false}
                  tickLine={false}
                  angle={-25}
                  textAnchor="end"
                  height={50}
                />
                <YAxis
                  tick={{ fill: "#6b7280", fontSize: 10, fontFamily: "monospace" }}
                  axisLine={false}
                  tickLine={false}
                  width={36}
                />
                <Tooltip
                  contentStyle={{ background: "#1a1f2e", border: "1px solid #2a2f3e", borderRadius: 4, fontSize: 11, fontFamily: "monospace" }}
                  formatter={(value: number) => [value.toLocaleString(), "events"]}
                  labelStyle={{ color: "#9ca3af" }}
                />
                <Bar dataKey="count" radius={[3, 3, 0, 0]} maxBarSize={24}>
                  {eventDistributionData.map((_, index) => (
                    <Cell key={index} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="chart-card">
          <p className="section-title">Department Activity</p>
          {analyticsLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={departmentActivityData} margin={{ top: 10, right: 8, left: 8, bottom: 12 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis
                  dataKey="department"
                  tick={{ fill: "#6b7280", fontSize: 10, fontFamily: "monospace" }}
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
                  contentStyle={{ background: "#1a1f2e", border: "1px solid #2a2f3e", borderRadius: 4, fontSize: 11, fontFamily: "monospace" }}
                  formatter={(value: number, name: string) => [value.toLocaleString(), name]}
                  labelStyle={{ color: "#9ca3af" }}
                />
                <Bar dataKey="event_count" fill="#34d399" radius={[3, 3, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="chart-card xl:col-span-2">
          <p className="section-title">Events Over Time</p>
          <EventsOverTimeChart startDate={dateRange.startDate} endDate={dateRange.endDate} />
        </div>
        <div className="chart-card">
          <p className="section-title">Token Usage by Role</p>
          <TokensByRoleChart />
        </div>
      </div>

      <div className="chart-card">
        <p className="section-title">Peak Usage Hours (UTC)</p>
        <PeakHoursChart />
        <p className="text-[10px] font-mono text-muted-foreground mt-2">
          <span className="inline-block w-2 h-2 rounded-sm bg-primary mr-1 align-middle" />
          Business hours highlighted - 24h view
        </p>
      </div>
    </div>
  );
}
