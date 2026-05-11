import * as React from "react";
import { AlertCircle, Check, Loader2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

export type AutoSaveStatus = "idle" | "editing" | "saving" | "saved" | "error";

export interface NoteEditorProps {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  maxLength?: number;
  autoSaveStatus?: AutoSaveStatus;
  savedAt?: Date;
  onRetry?: () => void;
  disabled?: boolean;
  minRows?: number;
  "aria-label"?: string;
  className?: string;
}

function formatSavedAt(d: Date): string {
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function StatusIndicator({
  status,
  savedAt,
  onRetry,
}: {
  status: AutoSaveStatus;
  savedAt?: Date;
  onRetry?: () => void;
}) {
  switch (status) {
    case "editing":
      return (
        <span className="text-muted-foreground/80" aria-live="polite">
          Editando…
        </span>
      );
    case "saving":
      return (
        <span className="inline-flex items-center gap-1 text-muted-foreground" aria-live="polite">
          <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
          Salvando…
        </span>
      );
    case "saved":
      return (
        <span className="inline-flex items-center gap-1 text-status-done" aria-live="polite">
          <Check className="h-3 w-3" aria-hidden="true" />
          Salvo{savedAt ? ` às ${formatSavedAt(savedAt)}` : ""}
        </span>
      );
    case "error":
      return (
        <span className="inline-flex items-center gap-2 text-destructive" role="alert">
          <AlertCircle className="h-3 w-3" aria-hidden="true" />
          Não conseguimos salvar.
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center gap-1 font-medium underline-offset-2 hover:underline focus-visible:outline-none focus-visible:underline"
            >
              <RefreshCw className="h-3 w-3" aria-hidden="true" />
              Tentar de novo
            </button>
          )}
        </span>
      );
    case "idle":
    default:
      return null;
  }
}

export function NoteEditor({
  value,
  onChange,
  placeholder = "Comece a escrever… salvamos automaticamente.",
  maxLength,
  autoSaveStatus = "idle",
  savedAt,
  onRetry,
  disabled = false,
  minRows = 6,
  "aria-label": ariaLabel = "Anotações",
  className,
}: NoteEditorProps) {
  const remaining = maxLength !== undefined ? maxLength - value.length : undefined;
  const nearLimit =
    maxLength !== undefined && remaining !== undefined && remaining <= maxLength * 0.1;

  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-xl border border-border bg-card p-3 shadow-card transition-colors focus-within:border-primary/40",
        autoSaveStatus === "error" && "border-destructive/40",
        className,
      )}
    >
      <textarea
        value={value}
        onChange={(e) => {
          if (maxLength !== undefined && e.target.value.length > maxLength) return;
          onChange(e.target.value);
        }}
        placeholder={placeholder}
        disabled={disabled}
        rows={minRows}
        maxLength={maxLength}
        aria-label={ariaLabel}
        aria-describedby="note-editor-status"
        className="w-full resize-y bg-transparent text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/60 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
      />

      <div
        id="note-editor-status"
        className="flex items-center justify-between gap-2 border-t border-border/60 pt-2 text-[11px]"
      >
        <StatusIndicator status={autoSaveStatus} savedAt={savedAt} onRetry={onRetry} />

        {maxLength !== undefined && (
          <span
            className={cn(
              "tabular-nums text-muted-foreground",
              nearLimit && "text-priority-high",
              remaining !== undefined && remaining <= 0 && "text-destructive",
            )}
            aria-label={`${value.length} de ${maxLength} caracteres`}
          >
            {value.length}/{maxLength}
          </span>
        )}
      </div>
    </div>
  );
}
