import { heatmapData } from "@/data/mockData";

const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const getColor = (value: number) => {
  if (value >= 80) return 'hsl(175, 80%, 50%)';
  if (value >= 60) return 'hsl(175, 70%, 40%)';
  if (value >= 40) return 'hsl(175, 60%, 30%)';
  if (value >= 20) return 'hsl(175, 50%, 20%)';
  return 'hsl(220, 14%, 14%)';
};

const ActivityHeatmap = () => (
  <div className="chart-card">
    <h3 className="section-title">Activity Heatmap (Hour × Day)</h3>
    <div className="overflow-x-auto">
      <div className="min-w-[600px]">
        <div className="flex gap-0.5 mb-1 ml-10">
          {Array.from({ length: 24 }, (_, i) => (
            <div key={i} className="flex-1 text-center text-[8px] text-muted-foreground font-display">
              {i % 3 === 0 ? `${i}` : ''}
            </div>
          ))}
        </div>
        {days.map((day, dayIdx) => (
          <div key={day} className="flex gap-0.5 mb-0.5">
            <div className="w-10 text-[10px] text-muted-foreground font-display flex items-center">{day}</div>
            {heatmapData[dayIdx].map((value, hourIdx) => (
              <div
                key={hourIdx}
                className="flex-1 aspect-square rounded-sm transition-colors"
                style={{ backgroundColor: getColor(value) }}
                title={`${day} ${hourIdx}:00 — ${value} sessions`}
              />
            ))}
          </div>
        ))}
        <div className="flex items-center gap-2 mt-3 ml-10">
          <span className="text-[9px] text-muted-foreground font-display">Less</span>
          {[14, 20, 30, 40, 50].map((v, i) => (
            <div key={i} className="w-3 h-3 rounded-sm" style={{ backgroundColor: getColor(v) }} />
          ))}
          <span className="text-[9px] text-muted-foreground font-display">More</span>
        </div>
      </div>
    </div>
  </div>
);

export default ActivityHeatmap;
