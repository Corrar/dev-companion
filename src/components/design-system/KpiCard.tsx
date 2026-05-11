import * as React from "react";
import { ArrowDownRight, ArrowUpRight, Minus, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { SparklineBar, type SparklineTone } from "./SparklineBar";

export type KpiTrend = "up" | "down" | "flat";
export type KpiState = "loading" | "empty" | "filled" | "error";

export interface KpiCardProps {
  label: string;
  value?: string | number;
  hint?: string;
  delta?: number;
  deltaLabel?: string;
  trend?: KpiTrend;
  invertTrend?: boolean;
  sparkline?: number[];
  sparklineTone?: SparklineTone;
  state?: KpiState;
  onRetry?: () => void;
  onClick?: () => void;
  className?: string;
}

function inferTrend(delta?: number): KpiTrend {
  if (delta === undefined || delta === 0) return "flat";
  return delta > 0 ? "up" : "down";
}

function trendTone(trend: KpiTrend, invert: boolean): "good" | "bad" | "flat" {
  if (trend === "flat") return "flat";
  const positive = trend === "up";
  const isGood = invert ? !positive : positive;
  return isGood ? "good" : "bad";
}

export function KpiCard({
  label,
  value,
  hint,
  delta,
  deltaLabel,
  trend,
  invertTrend = false,
  sparkline,
  sparklineTone = "primary",
  state = "filled",
  onRetry,
  onClick,
  className,
}: KpiCardProps) {
  const resolvedTrend = trend ?? inferTrend(delta);
  const tone = trendTone(resolvedTrend, invertTrend);

  const interactive = !!onClick && state === "filled";
  const Wrapper = interactive ? "button" : "div";

  return (
    <Wrapper
      type={interactive ? "button" : undefined}
      onClick={interactive ? onClick : undefined}
      aria-label={interactive ? `${label}: ${value}` : undefined}
      className={cn(
        "group flex w-full flex-col gap-2 rounded-xl border border-border bg-card p-4 text-left shadow-card transition-all",
        interactive &&
          "hover:shadow-elevated hover:border-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        state === "error" && "border-destructive/30",
        className,
      )}
    >
      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>

      {state === "loading" && (
        <>
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-3 w-24" />
        </>
      )}

      {state === "error" && (
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm text-destructive">Não foi possível carregar.</span>
          {onRetry && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRetry();
              }}
              className="inline-flex items-center gap-1 text-xs font-medium text-destructive hover:underline focus-visible:outline-none focus-visible:underline"
            >
              <RefreshCw className="h-3 w-3" /> Tentar de novo
            </button>
          )}
        </div>
      )}

      {state === "empty" && (
        <>
          <span className="text-3xl font-bold tabular-nums text-muted-foreground">0</span>
          <span className="text-xs text-muted-foreground">Sem dados ainda.</span>
        </>
      )}

      {state === "filled" && (
        <>
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-3xl font-bold tabular-nums text-foreground">
              {value ?? "—"}
            </span>
            {sparkline && sparkline.length > 0 && (
              <SparklineBar
                data={sparkline}
                tone={sparklineTone}
                width={72}
                height={22}
                aria-label={`Tendência de ${label}`}
              />
            )}
          </div>

          {delta !== undefined && (
            <span
              className={cn(
                "inline-flex items-center gap-1 text-xs font-medium",
                tone === "good" && "text-status-done",
                tone === "bad" && "text-destructive",
                tone === "flat" && "text-muted-foreground",
              )}
            >
              {resolvedTrend === "up" && <ArrowUpRight className="h-3 w-3" />}
              {resolvedTrend === "down" && <ArrowDownRight className="h-3 w-3" />}
              {resolvedTrend === "flat" && <Minus className="h-3 w-3" />}
              {delta > 0 ? "+" : ""}
              {delta}
              {deltaLabel ? ` ${deltaLabel}` : ""}
            </span>
          )}

          {hint && (
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              {hint}
            </span>
          )}
        </>
      )}
    </Wrapper>
  );
}
