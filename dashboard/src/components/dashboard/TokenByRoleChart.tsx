import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { tokenByRoleData } from "@/data/mockData";

const TokenByRoleChart = () => (
  <div className="chart-card">
    <h3 className="section-title">Token Usage by Role</h3>
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={tokenByRoleData} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 14%, 18%)" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 10, fill: 'hsl(215, 12%, 50%)' }} tickLine={false} axisLine={false} tickFormatter={v => `${(v / 1000000).toFixed(1)}M`} />
          <YAxis dataKey="role" type="category" tick={{ fontSize: 11, fill: 'hsl(210, 20%, 92%)', fontFamily: 'JetBrains Mono' }} tickLine={false} axisLine={false} width={80} />
          <Tooltip
            contentStyle={{ background: 'hsl(220, 18%, 12%)', border: '1px solid hsl(220, 14%, 18%)', borderRadius: 8, fontSize: 12, fontFamily: 'JetBrains Mono' }}
            formatter={(value: number) => [`${(value / 1000).toFixed(0)}k tokens`, 'Tokens']}
          />
          <Bar dataKey="tokens" fill="hsl(35, 90%, 55%)" radius={[0, 4, 4, 0]} barSize={20} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  </div>
);

export default TokenByRoleChart;
