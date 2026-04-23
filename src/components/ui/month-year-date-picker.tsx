import * as React from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Props {
  value?: Date;
  onChange: (d: Date | undefined) => void;
  /** Disable any date strictly before today (default true) */
  disablePast?: boolean;
  /** How many years forward (default 3) */
  yearsForward?: number;
  /** Placeholder text */
  placeholder?: string;
  /** Trigger className */
  className?: string;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/**
 * Mobile-first date picker that uses Month + Year dropdowns and a tap-friendly
 * day grid — replaces the cramped `react-day-picker` calendar that doesn't
 * fit nicely on small screens.
 */
const MonthYearDatePicker: React.FC<Props> = ({
  value,
  onChange,
  disablePast = true,
  yearsForward = 3,
  placeholder = "Pick a date",
  className,
}) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [open, setOpen] = React.useState(false);
  const [viewMonth, setViewMonth] = React.useState<number>(value ? value.getMonth() : today.getMonth());
  const [viewYear, setViewYear] = React.useState<number>(value ? value.getFullYear() : today.getFullYear());

  React.useEffect(() => {
    if (value) {
      setViewMonth(value.getMonth());
      setViewYear(value.getFullYear());
    }
  }, [value]);

  const years = React.useMemo(() => {
    const start = today.getFullYear();
    return Array.from({ length: yearsForward + 1 }, (_, i) => start + i);
  }, [yearsForward]);

  // Build the day grid for current viewMonth/viewYear
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstWeekday = new Date(viewYear, viewMonth, 1).getDay(); // 0..6 (Sun..Sat)
  const blanks = Array.from({ length: firstWeekday }, (_, i) => i);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const isDisabled = (day: number) => {
    if (!disablePast) return false;
    const d = new Date(viewYear, viewMonth, day);
    return d < today;
  };

  const isSelected = (day: number) =>
    !!value &&
    value.getDate() === day &&
    value.getMonth() === viewMonth &&
    value.getFullYear() === viewYear;

  const isToday = (day: number) =>
    today.getDate() === day &&
    today.getMonth() === viewMonth &&
    today.getFullYear() === viewYear;

  const pickDay = (day: number) => {
    if (isDisabled(day)) return;
    const d = new Date(viewYear, viewMonth, day);
    onChange(d);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            "w-full h-11 rounded-xl justify-start font-normal",
            !value && "text-muted-foreground",
            className,
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value ? format(value, "PPP") : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[20rem] max-w-[calc(100vw-1.5rem)] p-3 z-[120] bg-popover pointer-events-auto"
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onInteractOutside={(e) => {
          // Keep popover open when interacting with the Select dropdowns (which portal to body)
          const target = e.target as HTMLElement | null;
          if (target?.closest("[data-radix-select-content], [data-radix-select-viewport], [data-radix-popper-content-wrapper]")) {
            e.preventDefault();
          }
        }}
      >
        {/* Month + Year selectors — use native selects for guaranteed click behavior inside Popover */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <select
            value={viewMonth}
            onChange={(e) => setViewMonth(Number(e.target.value))}
            className="h-9 rounded-lg text-xs px-2 bg-background border border-input font-sans focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {MONTHS.map((m, i) => (
              <option key={m} value={i}>{m}</option>
            ))}
          </select>
          <select
            value={viewYear}
            onChange={(e) => setViewYear(Number(e.target.value))}
            className="h-9 rounded-lg text-xs px-2 bg-background border border-input font-sans focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        {/* Weekday labels */}
        <div className="grid grid-cols-7 gap-1 text-[10px] font-semibold text-muted-foreground text-center mb-1">
          {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
            <span key={i}>{d}</span>
          ))}
        </div>

        {/* Day grid */}
        <div className="grid grid-cols-7 gap-1">
          {blanks.map((b) => (
            <span key={`b-${b}`} />
          ))}
          {days.map((d) => {
            const disabled = isDisabled(d);
            const selected = isSelected(d);
            const today_ = isToday(d);
            return (
              <button
                key={d}
                type="button"
                disabled={disabled}
                onClick={() => pickDay(d)}
                className={cn(
                  "h-9 rounded-lg text-sm font-sans transition-colors",
                  disabled && "text-muted-foreground/40 cursor-not-allowed",
                  !disabled && !selected && "hover:bg-accent text-foreground",
                  selected && "bg-primary text-primary-foreground font-semibold",
                  !selected && today_ && "ring-1 ring-primary/40",
                )}
              >
                {d}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default MonthYearDatePicker;
