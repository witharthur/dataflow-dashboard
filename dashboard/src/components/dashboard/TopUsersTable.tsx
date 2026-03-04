import { topUsersData } from "@/data/mockData";

const roleBadgeColors: Record<string, string> = {
  Developer: 'bg-primary/15 text-primary',
  Admin: 'bg-accent/15 text-accent',
  Analyst: 'bg-chart-4/15 text-chart-4',
  Designer: 'bg-chart-3/15 text-chart-3',
  Viewer: 'bg-chart-5/15 text-chart-5',
};

const TopUsersTable = () => (
  <div className="chart-card">
    <h3 className="section-title">Top Users by Token Usage</h3>
    <div className="space-y-2">
      {topUsersData.map((user, i) => (
        <div key={user.name} className="flex items-center gap-3 py-2 px-3 rounded-md hover:bg-secondary/50 transition-colors">
          <span className="text-xs text-muted-foreground font-display w-5">{i + 1}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-display text-foreground truncate">{user.name}</p>
            <p className="text-[10px] text-muted-foreground">{user.sessions} sessions</p>
          </div>
          <span className={`text-[10px] font-display px-2 py-0.5 rounded-full ${roleBadgeColors[user.role] || ''}`}>
            {user.role}
          </span>
          <span className="text-sm font-display text-foreground tabular-nums">
            {(user.tokens / 1000).toFixed(0)}k
          </span>
        </div>
      ))}
    </div>
  </div>
);

export default TopUsersTable;
