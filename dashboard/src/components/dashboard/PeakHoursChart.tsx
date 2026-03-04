import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { peakHoursData } from "@/data/mockData";

const PeakHoursChart = () => (
  <div className="chart-card">
    <h3 className="section-title">Peak Usage Hours</h3>
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={peakHoursData}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 14%, 18%)" vertical={false} />
          <XAxis dataKey="hour" tick={{ fontSize: 9, fill: 'hsl(215, 12%, 50%)' }} tickLine={false} axisLine={false} interval={2} />
          <YAxis tick={{ fontSize: 10, fill: 'hsl(215, 12%, 50%)' }} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{ background: 'hsl(220, 18%, 12%)', border: '1px solid hsl(220, 14%, 18%)', borderRadius: 8, fontSize: 12, fontFamily: 'JetBrains Mono' }}
          />
          <Bar dataKey="sessions" fill="hsl(175, 80%, 50%)" radius={[2, 2, 0, 0]} barSize={16} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  </div>
);

export default PeakHoursChart;
