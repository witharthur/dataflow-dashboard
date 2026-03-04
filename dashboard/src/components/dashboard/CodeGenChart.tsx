import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { codeGenFrequencyData } from "@/data/mockData";

const CodeGenChart = () => (
  <div className="chart-card">
    <h3 className="section-title">Code Generation Frequency</h3>
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={codeGenFrequencyData}>
          <defs>
            <linearGradient id="genGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(260, 60%, 60%)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(260, 60%, 60%)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="compGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(175, 80%, 50%)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(175, 80%, 50%)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 14%, 18%)" />
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'hsl(215, 12%, 50%)' }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 10, fill: 'hsl(215, 12%, 50%)' }} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{ background: 'hsl(220, 18%, 12%)', border: '1px solid hsl(220, 14%, 18%)', borderRadius: 8, fontSize: 12, fontFamily: 'JetBrains Mono' }}
          />
          <Area type="monotone" dataKey="generations" stroke="hsl(260, 60%, 60%)" fill="url(#genGrad)" strokeWidth={2} />
          <Area type="monotone" dataKey="completions" stroke="hsl(175, 80%, 50%)" fill="url(#compGrad)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
    <div className="flex gap-4 mt-3">
      <div className="flex items-center gap-2 text-[10px] font-display text-muted-foreground">
        <div className="w-3 h-0.5 rounded bg-chart-3" /> Generations
      </div>
      <div className="flex items-center gap-2 text-[10px] font-display text-muted-foreground">
        <div className="w-3 h-0.5 rounded bg-primary" /> Completions
      </div>
    </div>
  </div>
);

export default CodeGenChart;
