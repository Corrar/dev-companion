import * as React from "react";
import { Building2, CalendarClock } from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusBadge, type StatusBadgeTone } from "./StatusBadge";

export type TicketPriorityKey = "baixa" | "media" | "alta" | "urgente";

const PRIORITY_TONE: Record<TicketPriorityKey, StatusBadgeTone> = {
  baixa: "low",
  media: "medium",
  alta: "high",
  urgente: "urgent",
};

const PRIORITY_LABEL: Record<TicketPriorityKey, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
  urgente: "Urgente",
};

const PRIORITY_VAR: Record<TicketPriorityKey, string> = {
  baixa: "--priority-low",
  media: "--priority-medium",
  alta: "--priority-high",
  urgente: "--priority-urgent",
};

export interface TicketRowProps {
  title: string;
  description?: string;
  priority: TicketPriorityKey;
  status: { label: string; tone: StatusBadgeTone };
  sector?: string;
  requester?: string;
  createdAt: Date | string;
  scheduled?: boolean;
  actions?: React.ReactNode;
  onSelect?: () => void;
  selected?: boolean;
  compact?: boolean;
  className?: string;
}

function formatCreatedAt(value: Date | string): string {
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const TicketRow = React.forwardRef<HTMLLIElement, TicketRowProps>(
  (
    {
      title,
      description,
      priority,
      status,
      sector,
      requester,
      createdAt,
      scheduled = false,
      actions,
      onSelect,
      selected = false,
      compact = false,
      className,
    },
    ref,
  ) => {
    const interactive = !!onSelect;
    const handleKey: React.KeyboardEventHandler<HTMLLIElement> = (e) => {
      if (!interactive) return;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onSelect?.();
      }
    };

    return (
      <li
        ref={ref}
        role={interactive ? "button" : undefined}
        tabIndex={interactive ? 0 : undefined}
        aria-pressed={interactive ? selected : undefined}
        onClick={interactive ? onSelect : undefined}
        onKeyDown={handleKey}
        className={cn(
          "group relative overflow-hidden rounded-xl border border-border bg-card shadow-card transition-all",
          interactive &&
            "cursor-pointer hover:shadow-elevated hover:border-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          selected && "border-primary ring-2 ring-primary/20",
          className,
        )}
      >
        <span
          aria-hidden="true"
          className="absolute left-0 top-0 h-full w-1.5"
          style={{ background: `var(${PRIORITY_VAR[priority]})` }}
        />

        <div
          className={cn(
            "flex flex-col gap-3 pl-5 pr-4 sm:flex-row sm:items-start sm:justify-between",
            compact ? "py-3" : "py-4",
          )}
        >
          <div className="min-w-0 flex-1">
            <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
              <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
              <StatusBadge tone={PRIORITY_TONE[priority]}>
                {PRIORITY_LABEL[priority]}
              </StatusBadge>
              {sector && (
                <span className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
                  <Building2 className="h-3 w-3" aria-hidden="true" />
                  {sector}
                </span>
              )}
              {scheduled && (
                <StatusBadge tone="success">
                  <CalendarClock className="h-3 w-3" aria-hidden="true" /> Agendado
                </StatusBadge>
              )}
            </div>

            <h4 className="font-bold leading-snug text-foreground">{title}</h4>
            {description && !compact && (
              <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                {description}
              </p>
            )}

            {(requester || createdAt) && (
              <div className="mt-2.5 flex items-center gap-3 text-[11px] text-muted-foreground">
                {requester && (
                  <span className="flex items-center gap-1">
                    <span aria-hidden="true" className="inline-block h-1.5 w-1.5 rounded-full bg-muted-foreground/60" />
                    Por <strong className="text-foreground/80">{requester}</strong>
                  </span>
                )}
                <span>
                  <time dateTime={typeof createdAt === "string" ? createdAt : createdAt.toISOString()}>
                    {formatCreatedAt(createdAt)}
                  </time>
                </span>
              </div>
            )}
          </div>

          {actions && (
            <div
              className="flex shrink-0 flex-col gap-2 sm:min-w-[210px] sm:items-end"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            >
              {actions}
            </div>
          )}
        </div>
      </li>
    );
  },
);
TicketRow.displayName = "TicketRow";
