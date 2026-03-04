import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { sessionsPerDayData } from "@/data/mockData";

const SessionsPerDayChart = () => (
  <div className="chart-card">
    <h3 className="section-title">Sessions per Day</h3>
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={sessionsPerDayData}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 14%, 18%)" vertical={false} />
          <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'hsl(210, 20%, 92%)', fontFamily: 'JetBrains Mono' }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 10, fill: 'hsl(215, 12%, 50%)' }} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{ background: 'hsl(220, 18%, 12%)', border: '1px solid hsl(220, 14%, 18%)', borderRadius: 8, fontSize: 12, fontFamily: 'JetBrains Mono' }}
          />
          <Bar dataKey="sessions" fill="hsl(260, 60%, 60%)" radius={[4, 4, 0, 0]} barSize={32} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  </div>
);

export default SessionsPerDayChart;
