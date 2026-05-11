import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Tokens semânticos via @theme inline em styles.css.
 * Tailwind v4 entende bg-priority-high/12 (cor + opacidade) automaticamente.
 */
const statusBadgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-md border font-semibold uppercase tracking-wider whitespace-nowrap transition-colors",
  {
    variants: {
      tone: {
        low: "border-priority-low/30 bg-priority-low/15 text-priority-low",
        medium: "border-priority-medium/30 bg-priority-medium/15 text-priority-medium",
        high: "border-priority-high/30 bg-priority-high/15 text-priority-high",
        urgent: "border-priority-urgent/30 bg-priority-urgent/15 text-priority-urgent",
        neutral: "border-border bg-muted text-muted-foreground",
        info: "border-status-pending/30 bg-status-pending-bg text-status-pending",
        warning: "border-status-progress/30 bg-status-progress-bg text-status-progress",
        success: "border-status-done/30 bg-status-done-bg text-status-done",
      },
      size: {
        sm: "px-1.5 py-0.5 text-[10px]",
        md: "px-2 py-0.5 text-xs",
      },
    },
    defaultVariants: { tone: "neutral", size: "sm" },
  },
);

export type StatusBadgeTone = NonNullable<VariantProps<typeof statusBadgeVariants>["tone"]>;

export interface StatusBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof statusBadgeVariants> {
  dot?: boolean;
  "aria-label"?: string;
}

export const StatusBadge = React.forwardRef<HTMLSpanElement, StatusBadgeProps>(
  ({ className, tone, size, dot, children, ...props }, ref) => (
    <span
      ref={ref}
      role="status"
      className={cn(statusBadgeVariants({ tone, size }), className)}
      {...props}
    >
      {dot && (
        <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />
      )}
      {children}
    </span>
  ),
);
StatusBadge.displayName = "StatusBadge";
