import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StatusBadgeTone } from "./StatusBadge";

const MARKER_VAR: Partial<Record<StatusBadgeTone, string>> = {
  low: "--priority-low",
  medium: "--priority-medium",
  high: "--priority-high",
  urgent: "--priority-urgent",
  info: "--status-pending",
  success: "--status-done",
  warning: "--status-progress",
  neutral: "--muted-foreground",
};

export interface CalendarMarker {
  tone: StatusBadgeTone;
  label?: string;
}

export type MarkerMap = Record<string, CalendarMarker[]>;

export interface MiniCalendarProps {
  month: Date;
  selected?: Date;
  markers?: MarkerMap;
  onSelect?: (date: Date) => void;
  onChangeMonth?: (nextMonth: Date) => void;
  weekStartsOn?: 0 | 1;
  loading?: boolean;
  className?: string;
}

const WEEK_LABELS_SUN = ["D", "S", "T", "Q", "Q", "S", "S"];
const WEEK_LABELS_MON = ["S", "T", "Q", "Q", "S", "S", "D"];

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function buildGrid(month: Date, weekStartsOn: 0 | 1): Date[] {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const offset = (first.getDay() - weekStartsOn + 7) % 7;
  const start = new Date(first);
  start.setDate(first.getDate() - offset);
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

export function MiniCalendar({
  month,
  selected,
  markers = {},
  onSelect,
  onChangeMonth,
  weekStartsOn = 0,
  loading = false,
  className,
}: MiniCalendarProps) {
  const today = new Date();
  const cells = React.useMemo(
    () => buildGrid(month, weekStartsOn),
    [month, weekStartsOn],
  );
  const weekLabels = weekStartsOn === 1 ? WEEK_LABELS_MON : WEEK_LABELS_SUN;
  const monthLabel = month
    .toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
    .replace(/^./, (c) => c.toUpperCase());

  const goPrev = () =>
    onChangeMonth?.(new Date(month.getFullYear(), month.getMonth() - 1, 1));
  const goNext = () =>
    onChangeMonth?.(new Date(month.getFullYear(), month.getMonth() + 1, 1));
  const goToday = () =>
    onChangeMonth?.(new Date(today.getFullYear(), today.getMonth(), 1));

  return (
    <div
      role="grid"
      aria-label={`Calendário de ${monthLabel}`}
      className={cn(
        "rounded-xl border border-border bg-card p-3 shadow-card",
        className,
      )}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-semibold capitalize text-foreground">
          {monthLabel}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={goToday}
            className="rounded-md px-2 py-1 text-[11px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Ir para hoje"
          >
            Hoje
          </button>
          <button
            type="button"
            onClick={goPrev}
            className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Mês anterior"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={goNext}
            className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Próximo mês"
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div role="row" className="mb-1 grid grid-cols-7 gap-1">
        {weekLabels.map((w, i) => (
          <span
            key={i}
            role="columnheader"
            className="text-center text-[10px] font-bold uppercase text-muted-foreground"
          >
            {w}
          </span>
        ))}
      </div>

      <div className={cn("grid grid-cols-7 gap-1", loading && "animate-pulse")}>
        {cells.map((d, i) => {
          const inMonth = d.getMonth() === month.getMonth();
          const isToday = isSameDay(d, today);
          const isSelected = !!selected && isSameDay(d, selected);
          const iso = toISODate(d);
          const dayMarkers = markers[iso] ?? [];

          return (
            <button
              key={i}
              role="gridcell"
              type="button"
              onClick={() => onSelect?.(d)}
              aria-label={d.toLocaleDateString("pt-BR", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
              aria-selected={isSelected}
              aria-current={isToday ? "date" : undefined}
              tabIndex={isSelected || (selected === undefined && isToday) ? 0 : -1}
              className={cn(
                "relative flex h-9 flex-col items-center justify-center rounded-md text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                inMonth ? "text-foreground" : "text-muted-foreground/40",
                !isSelected && "hover:bg-accent",
                isToday && !isSelected && "font-bold text-primary",
                isSelected && "bg-primary text-primary-foreground hover:bg-primary/90",
              )}
            >
              <span>{d.getDate()}</span>
              {dayMarkers.length > 0 && (
                <span
                  className="absolute bottom-1 flex gap-0.5"
                  aria-label={dayMarkers
                    .map((m) => m.label)
                    .filter(Boolean)
                    .join(", ")}
                >
                  {dayMarkers.slice(0, 3).map((m, j) => (
                    <span
                      key={j}
                      aria-hidden="true"
                      className="h-1 w-1 rounded-full"
                      style={{
                        background: `var(${MARKER_VAR[m.tone] ?? "--muted-foreground"})`,
                      }}
                    />
                  ))}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
