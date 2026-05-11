import * as React from "react";
import { Clock, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { StatusBadge, type StatusBadgeTone } from "./StatusBadge";
import type { TicketPriorityKey } from "./TicketRow";

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

export interface TaskItemProps {
  id: string | number;
  title: string;
  priority: TicketPriorityKey;
  done: boolean;
  deadline?: Date | string;
  overdueHighlight?: boolean;
  subtitle?: React.ReactNode;
  onToggle: (next: boolean) => void;
  actions?: React.ReactNode;
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
  className?: string;
}

function fmtDeadline(value: Date | string): string {
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const TaskItem = React.forwardRef<HTMLDivElement, TaskItemProps>(
  (
    {
      id,
      title,
      priority,
      done,
      deadline,
      overdueHighlight = false,
      subtitle,
      onToggle,
      actions,
      dragHandleProps,
      className,
    },
    ref,
  ) => {
    const overdue = overdueHighlight && !done;
    const checkboxId = `task-${id}`;

    return (
      <div
        ref={ref}
        className={cn(
          "group flex items-start gap-2 rounded-xl border bg-card p-3 transition-all",
          done && "opacity-70",
          overdue
            ? "border-destructive/40 bg-destructive/5"
            : "border-border hover:border-primary/30 hover:shadow-card",
          className,
        )}
      >
        {dragHandleProps && (
          <button
            type="button"
            aria-label="Arrastar para reordenar"
            className="mt-0.5 cursor-grab text-muted-foreground/40 opacity-0 transition-opacity hover:text-muted-foreground focus-visible:opacity-100 group-hover:opacity-100 active:cursor-grabbing"
            {...dragHandleProps}
          >
            <GripVertical className="h-4 w-4" aria-hidden="true" />
          </button>
        )}

        <Checkbox
          id={checkboxId}
          checked={done}
          onCheckedChange={(c) => onToggle(c === true)}
          className="mt-0.5"
          aria-label={done ? `Reabrir tarefa: ${title}` : `Concluir tarefa: ${title}`}
        />

        <div className="min-w-0 flex-1">
          <label
            htmlFor={checkboxId}
            className={cn(
              "block cursor-pointer text-sm font-semibold leading-snug",
              done ? "text-muted-foreground line-through" : "text-foreground",
            )}
          >
            {title}
          </label>

          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
            <StatusBadge tone={PRIORITY_TONE[priority]} size="sm">
              {PRIORITY_LABEL[priority]}
            </StatusBadge>
            {subtitle && <span>{subtitle}</span>}
            {deadline && (
              <span
                className={cn(
                  "inline-flex items-center gap-1",
                  overdue && "font-semibold text-destructive",
                )}
              >
                <Clock className="h-3 w-3" aria-hidden="true" />
                <time
                  dateTime={
                    typeof deadline === "string" ? deadline : deadline.toISOString()
                  }
                >
                  {fmtDeadline(deadline)}
                </time>
                {overdue && <span className="sr-only">(atrasada)</span>}
              </span>
            )}
          </div>
        </div>

        {actions && <div className="shrink-0">{actions}</div>}
      </div>
    );
  },
);
TaskItem.displayName = "TaskItem";
