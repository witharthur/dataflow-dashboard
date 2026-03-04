import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { durationByRoleData } from "@/data/mockData";

const DurationByRoleChart = () => (
  <div className="chart-card">
    <h3 className="section-title">Avg Session Duration by Role</h3>
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={durationByRoleData}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 14%, 18%)" vertical={false} />
          <XAxis dataKey="role" tick={{ fontSize: 11, fill: 'hsl(210, 20%, 92%)', fontFamily: 'JetBrains Mono' }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 10, fill: 'hsl(215, 12%, 50%)' }} tickLine={false} axisLine={false} unit=" min" />
          <Tooltip
            contentStyle={{ background: 'hsl(220, 18%, 12%)', border: '1px solid hsl(220, 14%, 18%)', borderRadius: 8, fontSize: 12, fontFamily: 'JetBrains Mono' }}
            formatter={(value: number) => [`${value} min`, 'Avg Duration']}
          />
          <Bar dataKey="duration" fill="hsl(140, 60%, 45%)" radius={[4, 4, 0, 0]} barSize={32} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  </div>
);

export default DurationByRoleChart;
