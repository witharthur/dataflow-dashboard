import { useState } from "react";
import { Activity } from "lucide-react";
import KPICard from "@/components/dashboard/KPICard";
import FilterBar from "@/components/dashboard/FilterBar";
import TokenTrendChart from "@/components/dashboard/TokenTrendChart";
import TokenByRoleChart from "@/components/dashboard/TokenByRoleChart";
import PeakHoursChart from "@/components/dashboard/PeakHoursChart";
import SessionsPerDayChart from "@/components/dashboard/SessionsPerDayChart";
import ActivityHeatmap from "@/components/dashboard/ActivityHeatmap";
import TopUsersTable from "@/components/dashboard/TopUsersTable";
import DurationByRoleChart from "@/components/dashboard/DurationByRoleChart";
import CodeGenChart from "@/components/dashboard/CodeGenChart";
import { kpiData } from "@/data/mockData";

const Index = () => {
  const [, setFilters] = useState({ role: 'All', dateRange: '30d', project: 'All' });

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <Activity className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-display font-bold text-foreground">Telemetry Analytics</h1>
          <div className="ml-auto flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse-glow" />
            <span className="text-[10px] font-display text-muted-foreground uppercase tracking-widest">Live</span>
          </div>
        </div>

        {/* Filters */}
        <FilterBar
          onRoleChange={(role) => setFilters(f => ({ ...f, role }))}
          onDateRangeChange={(dateRange) => setFilters(f => ({ ...f, dateRange }))}
          onProjectChange={(project) => setFilters(f => ({ ...f, project }))}
        />

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <KPICard label="Total Users" value={kpiData.totalUsers.toLocaleString()} change={kpiData.usersChange} />
          <KPICard label="Total Sessions" value={kpiData.totalSessions.toLocaleString()} change={kpiData.sessionsChange} />
          <KPICard label="Tokens Consumed" value={`${(kpiData.totalTokens / 1000000).toFixed(1)}M`} change={kpiData.tokensChange} />
          <KPICard label="Avg Duration" value={kpiData.avgSessionDuration.toFixed(1)} suffix="min" change={kpiData.durationChange} />
        </div>

        {/* Token Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
          <div className="lg:col-span-2">
            <TokenTrendChart />
          </div>
          <TokenByRoleChart />
        </div>

        {/* Activity Patterns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
          <PeakHoursChart />
          <SessionsPerDayChart />
        </div>
        <div className="mb-8">
          <ActivityHeatmap />
        </div>

        {/* User Behavior */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
          <TopUsersTable />
          <DurationByRoleChart />
          <CodeGenChart />
        </div>
      </div>
    </div>
  );
};

export default Index;
