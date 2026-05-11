import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Calendar as BigCalendar,
  Views,
  dateFnsLocalizer,
  type View,
  type EventProps,
  type SlotInfo,
} from "react-big-calendar";
import withDragAndDrop, {
  type EventInteractionArgs,
} from "react-big-calendar/lib/addons/dragAndDrop";
import {
  format,
  parse,
  startOfWeek,
  getDay,
  addDays,
  addMinutes,
  differenceInMinutes,
} from "date-fns";
import { ptBR } from "date-fns/locale/pt-BR";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "react-big-calendar/lib/addons/dragAndDrop/styles.css";
import "@/components/dev-companion-agenda.css";
import {
  CalendarDays,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Circle,
  Clock,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  MiniCalendar,
  SectionShell,
  StatusBadge,
  type MarkerMap,
  type StatusBadgeTone,
} from "@/components/design-system";
import {
  useLocalStorage,
  uid,
  type ProjectTask,
  type ProjectColumn,
} from "@/lib/storage";

export const Route = createFileRoute("/agenda")({
  head: () => ({ meta: [{ title: "Agenda — DevHub" }] }),
  component: AgendaPage,
});

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales: { "pt-BR": ptBR },
});

interface ScheduledTask extends ProjectTask {
  start: string; // narrow: garantido neste array
  end: string;
  startDate: Date;
  endDate: Date;
}

const DnDCalendar = withDragAndDrop<ScheduledTask>(BigCalendar);

const STATUS_TONE: Record<ProjectColumn, StatusBadgeTone> = {
  todo: "info",
  doing: "warning",
  done: "success",
};
const STATUS_LABEL: Record<ProjectColumn, string> = {
  todo: "A fazer",
  doing: "Em andamento",
  done: "Concluído",
};
const STATUS_CSS_VAR: Record<ProjectColumn, string> = {
  todo: "--status-pending",
  doing: "--status-progress",
  done: "--status-done",
};

function AgendaPage() {
  const [tasks, setTasks] = useLocalStorage<ProjectTask[]>("projects", []);
  const [date, setDate] = useState<Date>(new Date());
  const [view, setView] = useState<View>(Views.WEEK);
  const [selected, setSelected] = useState<ScheduledTask | null>(null);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [anchor, setAnchor] = useState<{ x: number; y: number } | null>(null);
  const [newTaskRange, setNewTaskRange] = useState<{
    start: Date;
    end: Date;
  } | null>(null);
  const [newTitle, setNewTitle] = useState("");

  // Atalhos D/W/M
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      const tag = t?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;
      if (t?.isContentEditable) return;
      const key = e.key.toLowerCase();
      if (key === "d") setView(Views.DAY);
      else if (key === "w") setView(Views.WEEK);
      else if (key === "m") setView(Views.MONTH);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Lista de tarefas com start/end (formato esperado pelo BigCalendar)
  const scheduledTasks = useMemo<ScheduledTask[]>(
    () =>
      tasks
        .filter((t): t is ProjectTask & { start: string; end: string } =>
          Boolean(t.start && t.end),
        )
        .map((t) => ({
          ...t,
          startDate: new Date(t.start),
          endDate: new Date(t.end),
        })),
    [tasks],
  );

  const proximas = useMemo(() => {
    const now = new Date();
    return scheduledTasks
      .filter((t) => t.endDate > now && t.column !== "done")
      .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())
      .slice(0, 5);
  }, [scheduledTasks]);

  const monthMarkers: MarkerMap = useMemo(() => {
    const map: MarkerMap = {};
    for (const t of scheduledTasks) {
      const iso = format(t.startDate, "yyyy-MM-dd");
      if (!map[iso]) map[iso] = [];
      map[iso]!.push({ tone: STATUS_TONE[t.column], label: t.title });
    }
    return map;
  }, [scheduledTasks]);

  const handleSelectEvent = (event: ScheduledTask, e: React.SyntheticEvent) => {
    const native = e as unknown as React.MouseEvent;
    const margin = 16;
    const x = Math.min(Math.max(margin, native.clientX), window.innerWidth - 320);
    const y = Math.min(Math.max(margin, native.clientY), window.innerHeight - 220);
    setAnchor({ x, y });
    setSelected(event);
    setPopoverOpen(true);
  };

  const handleSelectSlot = (slot: SlotInfo) => {
    const start = slot.start as Date;
    let end = slot.end as Date;
    if (differenceInMinutes(end, start) < 30) {
      end = addMinutes(start, 30);
    }
    setNewTaskRange({ start, end });
    setNewTitle("");
  };

  const handleEventDrop = ({
    event,
    start,
    end,
  }: EventInteractionArgs<ScheduledTask>) => {
    const startDate = start instanceof Date ? start : new Date(start);
    const endDate = end instanceof Date ? end : new Date(end);
    setTasks((prev) =>
      prev.map((t) =>
        t.id === event.id
          ? { ...t, start: startDate.toISOString(), end: endDate.toISOString() }
          : t,
      ),
    );
    toast.success(
      `"${event.title}" remarcada para ${format(startDate, "EEE dd/MM HH:mm", {
        locale: ptBR,
      })}`,
    );
  };

  const createTaskFromSlot = () => {
    if (!newTaskRange || !newTitle.trim()) return;
    const t: ProjectTask = {
      id: uid(),
      title: newTitle.trim(),
      description: "",
      column: "todo",
      checklist: [],
      createdAt: new Date().toISOString(),
      start: newTaskRange.start.toISOString(),
      end: newTaskRange.end.toISOString(),
    };
    setTasks((prev) => [t, ...prev]);
    toast.success("Tarefa agendada");
    setNewTaskRange(null);
    setNewTitle("");
  };

  const toggleDone = () => {
    if (!selected) return;
    const becoming = selected.column !== "done";
    setTasks((prev) =>
      prev.map((t) =>
        t.id === selected.id
          ? {
              ...t,
              column: becoming ? "done" : "todo",
              completedAt: becoming ? new Date().toISOString() : undefined,
            }
          : t,
      ),
    );
    toast.success(becoming ? "Tarefa concluída" : "Tarefa reaberta");
    setPopoverOpen(false);
  };

  const dayStart = useMemo(() => {
    const d = new Date();
    d.setHours(7, 0, 0, 0);
    return d;
  }, []);
  const dayEnd = useMemo(() => {
    const d = new Date();
    d.setHours(21, 0, 0, 0);
    return d;
  }, []);
  const scrollToTime = useMemo(() => {
    const d = new Date();
    d.setHours(Math.max(d.getHours() - 1, 7), 0, 0, 0);
    return d;
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Agenda</h1>
        <p className="text-sm text-muted-foreground">
          Arraste eventos para remarcar, clique em horário vazio para criar.
          Atalhos:{" "}
          <kbd className="rounded border border-border bg-muted/60 px-1 font-mono text-[10px]">
            D
          </kbd>{" "}
          <kbd className="rounded border border-border bg-muted/60 px-1 font-mono text-[10px]">
            W
          </kbd>{" "}
          <kbd className="rounded border border-border bg-muted/60 px-1 font-mono text-[10px]">
            M
          </kbd>{" "}
          alternam view.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px,1fr]">
        {/* SIDEBAR */}
        <aside className="space-y-4">
          <MiniCalendar
            month={date}
            selected={date}
            markers={monthMarkers}
            onSelect={(d) => setDate(d)}
            onChangeMonth={(d) => setDate(d)}
          />

          <SectionShell
            id="proximas-tarefas"
            title="Próximas"
            description={
              proximas.length === 0
                ? "Nada agendado"
                : `${proximas.length} pendentes`
            }
            iconTone="info"
            variant="bare"
          >
            {proximas.length === 0 ? (
              <p className="px-1 py-2 text-xs text-muted-foreground/70">
                Nenhuma tarefa futura.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {proximas.map((t) => (
                  <li key={t.id}>
                    <button
                      onClick={() => {
                        setDate(t.startDate);
                        setView(Views.DAY);
                      }}
                      className="group w-full rounded-lg p-2 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <div className="flex items-start gap-2">
                        <span
                          aria-hidden="true"
                          className="mt-1 h-2 w-2 shrink-0 rounded-full"
                          style={{
                            background: `var(${STATUS_CSS_VAR[t.column]})`,
                          }}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-xs font-bold text-foreground group-hover:text-primary">
                            {t.title}
                          </div>
                          <div className="text-[10px] font-medium text-muted-foreground">
                            {format(t.startDate, "EEE dd/MM 'às' HH:mm", {
                              locale: ptBR,
                            })}
                          </div>
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </SectionShell>

          <div className="rounded-xl border border-border bg-muted/30 p-3 text-[11px] leading-relaxed text-muted-foreground">
            <strong className="mb-1 block text-foreground">Como funciona</strong>
            Tarefas do kanban com horário (start/end) aparecem aqui. Clicar num
            horário vazio cria uma nova tarefa já com o horário pré-preenchido.
          </div>
        </aside>

        {/* CALENDÁRIO */}
        <div className="agenda-calendar min-h-[660px] rounded-2xl border border-border bg-card p-4 shadow-card">
          <AgendaToolbar
            date={date}
            view={view}
            onNavigate={setDate}
            onView={setView}
          />
          {scheduledTasks.length === 0 ? (
            <EmptyAgendaState />
          ) : (
            <div className="h-[600px]">
              <DnDCalendar
                localizer={localizer}
                events={scheduledTasks}
                startAccessor="startDate"
                endAccessor="endDate"
                culture="pt-BR"
                date={date}
                onNavigate={(d) => setDate(d)}
                view={view}
                onView={(v) => setView(v)}
                views={["month", "week", "day"]}
                style={{ height: "100%" }}
                eventPropGetter={eventStyleGetter}
                onSelectEvent={handleSelectEvent}
                onEventDrop={handleEventDrop}
                onEventResize={handleEventDrop}
                resizable
                selectable
                onSelectSlot={handleSelectSlot}
                scrollToTime={scrollToTime}
                components={{
                  event: AgendaEvent,
                  toolbar: () => null,
                }}
                step={30}
                timeslots={2}
                min={dayStart}
                max={dayEnd}
                formats={{
                  timeGutterFormat: (d: Date) => format(d, "HH:mm"),
                  eventTimeRangeFormat: () => "",
                  dayFormat: (d: Date) =>
                    format(d, "EEE dd", { locale: ptBR }).toUpperCase(),
                  weekdayFormat: (d: Date) =>
                    format(d, "EEEEEE", { locale: ptBR }).toUpperCase(),
                  selectRangeFormat: ({ start, end }) =>
                    `${format(start, "HH:mm")} – ${format(end, "HH:mm")}`,
                }}
                messages={{ noEventsInRange: "Sem tarefas neste período." }}
              />
            </div>
          )}
        </div>
      </div>

      {/* DIALOG DE NOVA TAREFA (via click slot vazio) */}
      <Dialog
        open={!!newTaskRange}
        onOpenChange={(o) => {
          if (!o) setNewTaskRange(null);
        }}
      >
        <DialogContent
          className="sm:max-w-md"
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
              e.preventDefault();
              createTaskFromSlot();
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>Nova tarefa agendada</DialogTitle>
          </DialogHeader>
          {newTaskRange && (
            <div className="space-y-3">
              <div className="rounded-md border border-border bg-muted/30 p-3 text-sm">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                  {format(newTaskRange.start, "EEE dd/MM", { locale: ptBR })} ·{" "}
                  {format(newTaskRange.start, "HH:mm")} –{" "}
                  {format(newTaskRange.end, "HH:mm")}
                </div>
              </div>
              <Input
                placeholder="Título da tarefa"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                autoFocus
              />
              <p className="text-[11px] text-muted-foreground">
                A tarefa entra no kanban como "A fazer" com este horário.
                Pressione{" "}
                <kbd className="rounded border border-border bg-muted/60 px-1 font-mono text-[10px]">
                  Ctrl
                </kbd>{" "}
                +{" "}
                <kbd className="rounded border border-border bg-muted/60 px-1 font-mono text-[10px]">
                  Enter
                </kbd>{" "}
                para criar.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setNewTaskRange(null)}>
              Cancelar
            </Button>
            <Button onClick={createTaskFromSlot} disabled={!newTitle.trim()}>
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* POPOVER DETALHE DO EVENTO */}
      {selected && popoverOpen && anchor && (
        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <PopoverTrigger asChild>
            <span
              style={{
                position: "fixed",
                left: anchor.x,
                top: anchor.y,
                width: 1,
                height: 1,
                pointerEvents: "none",
              }}
            />
          </PopoverTrigger>
          <PopoverContent
            collisionPadding={16}
            sideOffset={8}
            className="w-80 border-border bg-card p-0"
          >
            <div
              aria-hidden="true"
              className="h-1 w-full"
              style={{ background: `var(${STATUS_CSS_VAR[selected.column]})` }}
            />
            <div className="space-y-3 p-4">
              <div>
                <div className="mb-1">
                  <StatusBadge tone={STATUS_TONE[selected.column]} size="md">
                    {STATUS_LABEL[selected.column]}
                  </StatusBadge>
                </div>
                <h4 className="font-bold leading-tight text-foreground">
                  {selected.title}
                </h4>
                {selected.description && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {selected.description}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                <span>
                  {format(selected.startDate, "EEE dd/MM", { locale: ptBR })} ·{" "}
                  {format(selected.startDate, "HH:mm")} –{" "}
                  {format(selected.endDate, "HH:mm")}
                </span>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={toggleDone}
                  size="sm"
                  className="h-9 flex-1 font-bold"
                  variant={selected.column === "done" ? "secondary" : "default"}
                >
                  {selected.column === "done" ? (
                    <>
                      <CheckCircle className="mr-1.5 h-3.5 w-3.5" /> Reabrir
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-1.5 h-3.5 w-3.5" /> Concluir
                    </>
                  )}
                </Button>
                <Button asChild size="sm" variant="outline" className="h-9">
                  <a
                    href="/projects"
                    title="Abrir no kanban"
                    aria-label="Abrir no kanban"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}

// ───────────── TOOLBAR ─────────────
function AgendaToolbar({
  date,
  view,
  onNavigate,
  onView,
}: {
  date: Date;
  view: View;
  onNavigate: (d: Date) => void;
  onView: (v: View) => void;
}) {
  const today = () => onNavigate(new Date());
  const prev = () =>
    onNavigate(
      view === Views.MONTH
        ? new Date(date.getFullYear(), date.getMonth() - 1, 1)
        : addDays(date, view === Views.WEEK ? -7 : -1),
    );
  const next = () =>
    onNavigate(
      view === Views.MONTH
        ? new Date(date.getFullYear(), date.getMonth() + 1, 1)
        : addDays(date, view === Views.WEEK ? 7 : 1),
    );

  const label =
    view === Views.MONTH
      ? format(date, "MMMM 'de' yyyy", { locale: ptBR })
      : view === Views.WEEK
        ? `Semana de ${format(startOfWeek(date, { locale: ptBR }), "dd 'de' MMM", { locale: ptBR })}`
        : format(date, "EEEE, dd 'de' MMMM", { locale: ptBR });

  return (
    <div className="mb-4 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
      <div className="flex items-center gap-2">
        <button
          onClick={today}
          className="h-9 rounded-lg border border-border bg-card px-4 text-sm font-bold text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Hoje
        </button>
        <div className="flex items-center">
          <button
            onClick={prev}
            aria-label="Anterior"
            className="flex h-9 w-9 items-center justify-center rounded-l-lg border border-r-0 border-border bg-card text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={next}
            aria-label="Próximo"
            className="flex h-9 w-9 items-center justify-center rounded-r-lg border border-border bg-card text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <h2 className="ml-1 text-base font-black capitalize text-foreground sm:text-lg">
          {label}
        </h2>
        <LiveClock />
      </div>

      <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
        {[
          { v: Views.DAY, label: "Dia" },
          { v: Views.WEEK, label: "Semana" },
          { v: Views.MONTH, label: "Mês" },
        ].map((opt) => (
          <button
            key={opt.v}
            onClick={() => onView(opt.v)}
            className={`h-7 rounded-md px-3 text-xs font-bold transition-all ${
              view === opt.v
                ? "bg-card text-primary shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ───────────── LIVE CLOCK ─────────────
function LiveClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const i = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(i);
  }, []);
  return (
    <span
      className="ml-2 hidden items-center gap-1 rounded-md border border-border bg-muted/50 px-2 py-1 text-[11px] font-mono font-semibold tabular-nums text-muted-foreground sm:inline-flex"
      aria-label={`Agora ${format(now, "HH:mm")}`}
    >
      <Circle className="h-1.5 w-1.5 fill-destructive text-destructive" aria-hidden="true" />
      {format(now, "HH:mm")}
    </span>
  );
}

// ───────────── EVENT RENDERER ─────────────
function AgendaEvent({ event }: EventProps<ScheduledTask>) {
  const isDone = event.column === "done";
  return (
    <div
      className={`flex w-full items-center gap-1.5 leading-tight ${
        isDone ? "opacity-70" : ""
      }`}
    >
      {isDone ? (
        <CheckCircle className="h-3 w-3 shrink-0" aria-hidden="true" />
      ) : (
        <span
          aria-hidden="true"
          className="h-1.5 w-1.5 shrink-0 rounded-full bg-current"
        />
      )}
      <span
        className={`truncate text-[11px] font-semibold ${
          isDone ? "line-through" : ""
        }`}
      >
        {format(event.startDate, "HH:mm")}–{format(event.endDate, "HH:mm")} ·{" "}
        {event.title}
      </span>
    </div>
  );
}

function EmptyAgendaState() {
  return (
    <div className="flex h-[560px] flex-col items-center justify-center px-6 text-center">
      <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <CalendarDays className="h-8 w-8" aria-hidden="true" />
      </div>
      <h4 className="text-base font-bold text-foreground">
        Nenhuma tarefa agendada
      </h4>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        Clique em qualquer horário vazio no calendário para criar uma tarefa
        agendada, ou edite uma tarefa do kanban e adicione horário.
      </p>
    </div>
  );
}

const eventStyleGetter = (event: ScheduledTask) => {
  const colorVar = STATUS_CSS_VAR[event.column];
  return {
    style: {
      backgroundColor: `var(${colorVar})`,
      borderRadius: "6px",
      opacity: 0.92,
      color: "white",
      border: "0",
      display: "block",
      fontWeight: 600,
      fontSize: "12px",
    },
  };
};
