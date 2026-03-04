// Mock data for the telemetry analytics dashboard

export const kpiData = {
  totalUsers: 2847,
  totalSessions: 18432,
  totalTokens: 4_230_000,
  avgSessionDuration: 23.4, // minutes
  usersChange: 12.3,
  sessionsChange: 8.7,
  tokensChange: -3.2,
  durationChange: 5.1,
};

export const tokenTrendData = Array.from({ length: 30 }, (_, i) => {
  const date = new Date(2026, 1, i + 1);
  return {
    date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    tokens: Math.floor(80000 + Math.random() * 100000 + i * 2000),
    sessions: Math.floor(400 + Math.random() * 300 + i * 10),
  };
});

export const tokenByRoleData = [
  { role: 'Admin', tokens: 820000, color: 'hsl(175, 80%, 50%)' },
  { role: 'Developer', tokens: 2100000, color: 'hsl(35, 90%, 55%)' },
  { role: 'Designer', tokens: 640000, color: 'hsl(260, 60%, 60%)' },
  { role: 'Analyst', tokens: 470000, color: 'hsl(140, 60%, 45%)' },
  { role: 'Viewer', tokens: 200000, color: 'hsl(350, 70%, 55%)' },
];

export const peakHoursData = Array.from({ length: 24 }, (_, i) => ({
  hour: `${i.toString().padStart(2, '0')}:00`,
  sessions: Math.floor(
    i >= 9 && i <= 17
      ? 200 + Math.random() * 400
      : i >= 6 && i <= 21
      ? 80 + Math.random() * 150
      : 10 + Math.random() * 40
  ),
}));

export const sessionsPerDayData = [
  { day: 'Mon', sessions: 2840 },
  { day: 'Tue', sessions: 3120 },
  { day: 'Wed', sessions: 3350 },
  { day: 'Thu', sessions: 3100 },
  { day: 'Fri', sessions: 2780 },
  { day: 'Sat', sessions: 1420 },
  { day: 'Sun', sessions: 1050 },
];

export const heatmapData: number[][] = Array.from({ length: 7 }, (_, day) =>
  Array.from({ length: 24 }, (_, hour) => {
    const isWeekday = day < 5;
    const isWorkHour = hour >= 9 && hour <= 17;
    if (isWeekday && isWorkHour) return Math.floor(60 + Math.random() * 40);
    if (isWeekday) return Math.floor(10 + Math.random() * 30);
    return Math.floor(5 + Math.random() * 20);
  })
);

export const topUsersData = [
  { name: 'sarah.chen', tokens: 342000, sessions: 189, role: 'Developer' },
  { name: 'alex.kumar', tokens: 298000, sessions: 156, role: 'Developer' },
  { name: 'jordan.lee', tokens: 267000, sessions: 201, role: 'Admin' },
  { name: 'morgan.taylor', tokens: 234000, sessions: 134, role: 'Analyst' },
  { name: 'casey.wong', tokens: 198000, sessions: 112, role: 'Developer' },
  { name: 'riley.davis', tokens: 187000, sessions: 98, role: 'Designer' },
  { name: 'quinn.patel', tokens: 156000, sessions: 87, role: 'Developer' },
  { name: 'avery.smith', tokens: 143000, sessions: 76, role: 'Analyst' },
];

export const durationByRoleData = [
  { role: 'Admin', duration: 18.2 },
  { role: 'Developer', duration: 28.7 },
  { role: 'Designer', duration: 22.1 },
  { role: 'Analyst', duration: 31.4 },
  { role: 'Viewer', duration: 8.3 },
];

export const codeGenFrequencyData = Array.from({ length: 14 }, (_, i) => {
  const date = new Date(2026, 1, i + 15);
  return {
    date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    generations: Math.floor(150 + Math.random() * 300),
    completions: Math.floor(100 + Math.random() * 200),
  };
});
