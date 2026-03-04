import { TrendingUp, TrendingDown } from "lucide-react";

interface KPICardProps {
  label: string;
  value: string;
  change: number;
  suffix?: string;
}

const KPICard = ({ label, value, change, suffix }: KPICardProps) => {
  const isPositive = change >= 0;

  return (
    <div className="kpi-card">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground font-display mb-3">
        {label}
      </p>
      <div className="flex items-end justify-between">
        <p className="text-2xl font-bold font-display text-foreground">
          {value}
          {suffix && <span className="text-sm text-muted-foreground ml-1">{suffix}</span>}
        </p>
        <div className={`flex items-center gap-1 text-xs font-display ${isPositive ? 'text-chart-4' : 'text-destructive'}`}>
          {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          <span>{isPositive ? '+' : ''}{change}%</span>
        </div>
      </div>
    </div>
  );
};

export default KPICard;
