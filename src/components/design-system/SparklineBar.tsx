import * as React from "react";
import { cn } from "@/lib/utils";

export type SparklineTone =
  | "primary"
  | "muted"
  | "low"
  | "medium"
  | "high"
  | "urgent"
  | "success"
  | "danger";

const TONE_VAR: Record<SparklineTone, string> = {
  primary: "--primary",
  muted: "--muted-foreground",
  low: "--priority-low",
  medium: "--priority-medium",
  high: "--priority-high",
  urgent: "--priority-urgent",
  success: "--status-done",
  danger: "--destructive",
};

export interface SparklineBarProps extends React.HTMLAttributes<HTMLDivElement> {
  data: number[];
  width?: number;
  height?: number;
  gap?: number;
  tone?: SparklineTone;
  "aria-label": string;
}

export function SparklineBar({
  data,
  width = 80,
  height = 24,
  gap = 2,
  tone = "primary",
  className,
  "aria-label": ariaLabel,
  ...rest
}: SparklineBarProps) {
  const safe = data.length > 0 ? data : [0];
  const max = Math.max(...safe, 1);
  const min = Math.min(...safe, 0);
  const range = Math.max(max - min, 1);
  const barWidth = Math.max((width - gap * (safe.length - 1)) / safe.length, 1);
  const colorVar = TONE_VAR[tone];

  return (
    <div
      role="img"
      aria-label={ariaLabel}
      className={cn("inline-flex items-end", className)}
      {...rest}
    >
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        aria-hidden="true"
        className="overflow-visible"
      >
        {safe.map((v, i) => {
          const h = Math.max(((v - min) / range) * height, 2);
          const x = i * (barWidth + gap);
          const y = height - h;
          return (
            <rect
              key={i}
              x={x}
              y={y}
              width={barWidth}
              height={h}
              rx={1}
              style={{ fill: `var(${colorVar})` }}
              opacity={0.85}
            />
          );
        })}
      </svg>
    </div>
  );
}
