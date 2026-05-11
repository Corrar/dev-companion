import * as React from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import type { StatusBadgeTone } from "./StatusBadge";

export type SectionState = "loading" | "empty" | "filled" | "error";

const ICON_TONE_CLASSES: Record<StatusBadgeTone, string> = {
  low: "bg-priority-low/15 text-priority-low",
  medium: "bg-priority-medium/15 text-priority-medium",
  high: "bg-priority-high/15 text-priority-high",
  urgent: "bg-priority-urgent/15 text-priority-urgent",
  info: "bg-status-pending-bg text-status-pending",
  warning: "bg-status-progress-bg text-status-progress",
  success: "bg-status-done-bg text-status-done",
  neutral: "bg-muted text-muted-foreground",
};

export interface SectionShellProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  iconTone?: StatusBadgeTone;
  actions?: React.ReactNode;
  state?: SectionState;
  empty?: React.ReactNode;
  emptyMessage?: string;
  errorMessage?: string;
  onRetry?: () => void;
  loadingRows?: number;
  variant?: "card" | "bare";
  id?: string;
  children?: React.ReactNode;
  className?: string;
  contentClassName?: string;
}

export function SectionShell({
  title,
  description,
  icon,
  iconTone = "neutral",
  actions,
  state = "filled",
  empty,
  emptyMessage = "Nada por aqui ainda.",
  errorMessage = "Não foi possível carregar este conteúdo.",
  onRetry,
  loadingRows = 3,
  variant = "card",
  id,
  children,
  className,
  contentClassName,
}: SectionShellProps) {
  const headingId = id ? `${id}-title` : undefined;

  return (
    <section
      id={id}
      aria-labelledby={headingId}
      aria-busy={state === "loading"}
      className={cn(
        variant === "card" && "rounded-2xl border border-border bg-card shadow-card",
        className,
      )}
    >
      <header
        className={cn(
          "flex items-start justify-between gap-3",
          variant === "card" ? "border-b border-border px-5 py-4" : "pb-3",
        )}
      >
        <div className="flex min-w-0 items-center gap-2.5">
          {icon && (
            <div
              aria-hidden="true"
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                ICON_TONE_CLASSES[iconTone],
              )}
            >
              {icon}
            </div>
          )}
          <div className="min-w-0">
            <h2 id={headingId} className="truncate text-base font-bold leading-tight text-foreground">
              {title}
            </h2>
            {description && (
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{description}</p>
            )}
          </div>
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </header>

      <div className={cn(variant === "card" ? "p-5" : "", contentClassName)}>
        {state === "loading" && (
          <div className="space-y-2" role="status" aria-label={`${title} carregando`}>
            {Array.from({ length: loadingRows }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-xl" />
            ))}
          </div>
        )}

        {state === "error" && (
          <div
            role="alert"
            className="flex flex-col items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
          >
            <span className="inline-flex items-center gap-2 font-medium">
              <AlertCircle className="h-4 w-4" aria-hidden="true" />
              {errorMessage}
            </span>
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="inline-flex items-center gap-1 text-xs font-semibold underline-offset-2 hover:underline focus-visible:outline-none focus-visible:underline"
              >
                <RefreshCw className="h-3 w-3" aria-hidden="true" /> Tentar de novo
              </button>
            )}
          </div>
        )}

        {state === "empty" &&
          (empty ?? (
            <div className="flex items-center justify-center rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              {emptyMessage}
            </div>
          ))}

        {state === "filled" && children}
      </div>
    </section>
  );
}
