import type { CSSProperties } from "react";
import type { DateRange as PickerDateRange } from "react-day-picker";
import { CalendarDays, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { useDateRange } from "@/context/DateRangeContext";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const themeToggleButtonStyle: CSSProperties = {
  backgroundColor: "#ffffff",
  color: "#000000",
  border: "1px solid #cccccc",
  padding: "8px 16px",
  borderRadius: "8px",
  cursor: "pointer",
};

function toYmd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function fromYmd(value?: string): Date | undefined {
  if (!value) return undefined;
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return undefined;
  return new Date(y, m - 1, d);
}

function fmtRangeLabel(start?: string, end?: string): string {
  if (!start && !end) return "Select date range";
  if (start && !end) return `${start} - ...`;
  if (!start && end) return `... - ${end}`;
  return `${start} - ${end}`;
}

export default function Navbar() {
  const { dateRange, setDateRange } = useDateRange();
  const { theme, resolvedTheme, setTheme } = useTheme();

  const activeTheme = theme === "system" ? resolvedTheme : theme;
  const isLightTheme = activeTheme === "light";

  const selectedRange: PickerDateRange | undefined = {
    from: fromYmd(dateRange.startDate),
    to: fromYmd(dateRange.endDate),
  };

  const onRangeSelect = (range?: PickerDateRange) => {
    setDateRange({
      startDate: range?.from ? toYmd(range.from) : undefined,
      endDate: range?.to ? toYmd(range.to) : undefined,
    });
  };

  const applyPreset = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - (days - 1));
    setDateRange({ startDate: toYmd(start), endDate: toYmd(end) });
  };

  return (
    <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 px-4 md:px-6 py-3 border-b border-border bg-card/50 backdrop-blur-sm shrink-0">
      <div className="text-xs font-mono text-muted-foreground tracking-widest uppercase">
        Claude Code - Usage Intelligence
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-2 rounded-md border border-border bg-secondary/30 p-1.5">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="justify-start min-w-[220px] h-9 text-xs font-mono"
              >
                <CalendarDays size={14} />
                <span>{fmtRangeLabel(dateRange.startDate, dateRange.endDate)}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <div className="border-b border-border px-3 py-2 text-[11px] font-mono tracking-wider uppercase text-muted-foreground">
                Calendar Range
              </div>
              <Calendar
                mode="range"
                numberOfMonths={2}
                selected={selectedRange}
                onSelect={onRangeSelect}
                initialFocus
              />
              <div className="flex items-center gap-2 border-t border-border p-2">
                <Button size="sm" variant="secondary" className="h-7 text-[11px]" onClick={() => applyPreset(7)}>
                  Last 7D
                </Button>
                <Button size="sm" variant="secondary" className="h-7 text-[11px]" onClick={() => applyPreset(30)}>
                  Last 30D
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-[11px] ml-auto"
                  onClick={() => setDateRange({ startDate: undefined, endDate: undefined })}
                >
                  Clear
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        <button
          type="button"
          style={themeToggleButtonStyle}
          onClick={() => setTheme(isLightTheme ? "dark" : "light")}
          className="inline-flex items-center justify-center gap-2 text-sm leading-none"
        >
          {isLightTheme ? <Moon size={14} /> : <Sun size={14} />}
          <span>{isLightTheme ? "Switch to Dark Theme" : "Switch to Light Theme"}</span>
        </button>
      </div>
    </header>
  );
}
