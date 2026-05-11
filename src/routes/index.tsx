import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useLocalStorage, type Ticket, type ProjectTask } from "@/lib/storage";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker";
import { KpiCard, SectionShell } from "@/components/design-system";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Desempenho do Mês — DevHub" },
      { name: "description", content: "Resumo mensal de produtividade." },
    ],
  }),
  component: Dashboard,
});

const monthNames = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

function formatRange(r?: DateRange) {
  if (!r?.from) return "Selecionar período";
  const f = (d: Date) => d.toLocaleDateString("pt-BR");
  return r.to ? `${f(r.from)} — ${f(r.to)}` : f(r.from);
}

/** Conta itens com timestamp ISO dentro do range, agrupados por dia. */
function bucketByDay(
  iso: (string | undefined)[],
  from: Date,
  to: Date,
): number[] {
  const start = new Date(from); start.setHours(0, 0, 0, 0);
  const end = new Date(to); end.setHours(23, 59, 59, 999);
  const dayMs = 86_400_000;
  const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / dayMs));
  const buckets = new Array(days).fill(0);
  for (const t of iso) {
    if (!t) continue;
    const d = new Date(t).getTime();
    if (d < start.getTime() || d > end.getTime()) continue;
    const idx = Math.floor((d - start.getTime()) / dayMs);
    if (idx >= 0 && idx < days) buckets[idx]! += 1;
  }
  return buckets;
}

function Dashboard() {
  const [tickets] = useLocalStorage<Ticket[]>("tickets", []);
  const [tasks] = useLocalStorage<ProjectTask[]>("projects", []);
  const now = new Date();
  const [range, setRange] = useState<DateRange | undefined>({
    from: new Date(now.getFullYear(), now.getMonth(), 1),
    to: new Date(now.getFullYear(), now.getMonth() + 1, 0),
  });
  const year = now.getFullYear();

  const inRange = (iso?: string) => {
    if (!iso || !range?.from) return false;
    const d = new Date(iso).getTime();
    const from = new Date(range.from).setHours(0, 0, 0, 0);
    const to = new Date(range.to ?? range.from).setHours(23, 59, 59, 999);
    return d >= from && d <= to;
  };

  const stats = useMemo(() => {
    const tasksDone = tasks.filter(
      (t) => t.column === "done" && inRange(t.completedAt),
    ).length;
    const tasksCreated = tasks.filter((t) => inRange(t.createdAt)).length;
    const ticketsDone = tickets.filter(
      (t) => t.status === "concluido" && inRange(t.completedAt),
    ).length;
    const ongoing = tasks.filter((t) => t.column !== "done").length;
    const productivity =
      tasksCreated > 0 ? Math.round((tasksDone / tasksCreated) * 100) : 0;
    return { tasksDone, tasksCreated, ticketsDone, ongoing, productivity };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tickets, tasks, range]);

  // Produtividade do período anterior, mesmo tamanho — usado como delta no KpiCard.
  const previousProductivity = useMemo(() => {
    if (!range?.from) return undefined;
    const span =
      (range.to ?? range.from).getTime() - range.from.getTime() + 86_400_000;
    const prevTo = new Date(range.from.getTime() - 86_400_000);
    const prevFrom = new Date(prevTo.getTime() - span + 86_400_000);
    const inPrev = (iso?: string) => {
      if (!iso) return false;
      const d = new Date(iso).getTime();
      return d >= prevFrom.setHours(0, 0, 0, 0) && d <= prevTo.setHours(23, 59, 59, 999);
    };
    const done = tasks.filter((t) => t.column === "done" && inPrev(t.completedAt)).length;
    const created = tasks.filter((t) => inPrev(t.createdAt)).length;
    return created > 0 ? Math.round((done / created) * 100) : 0;
  }, [tasks, range]);

  // Sparklines: distribuição diária dentro do range
  const sparkTasksDone = useMemo(() => {
    if (!range?.from) return undefined;
    return bucketByDay(
      tasks.filter((t) => t.column === "done").map((t) => t.completedAt),
      range.from,
      range.to ?? range.from,
    );
  }, [tasks, range]);

  const sparkTicketsDone = useMemo(() => {
    if (!range?.from) return undefined;
    return bucketByDay(
      tickets.filter((t) => t.status === "concluido").map((t) => t.completedAt),
      range.from,
      range.to ?? range.from,
    );
  }, [tickets, range]);

  const productivityDelta =
    previousProductivity !== undefined
      ? stats.productivity - previousProductivity
      : undefined;

  const chartData = useMemo(() => {
    return Array.from({ length: 12 }, (_, m) => ({
      name: monthNames[m],
      Tarefas: tasks.filter(
        (t) =>
          t.column === "done" &&
          t.completedAt &&
          new Date(t.completedAt).getMonth() === m &&
          new Date(t.completedAt).getFullYear() === year,
      ).length,
      Chamados: tickets.filter(
        (t) =>
          t.status === "concluido" &&
          t.completedAt &&
          new Date(t.completedAt).getMonth() === m &&
          new Date(t.completedAt).getFullYear() === year,
      ).length,
    }));
  }, [tickets, tasks, year]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Desempenho do Período
          </h1>
          <p className="text-sm text-muted-foreground">
            Resumo da sua produtividade.
          </p>
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "justify-start gap-2 text-left font-normal",
                !range?.from && "text-muted-foreground",
              )}
            >
              <CalendarIcon className="h-4 w-4" />
              {formatRange(range)}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="range"
              selected={range}
              onSelect={setRange}
              numberOfMonths={1}
              initialFocus
              className="pointer-events-auto p-3"
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Tarefas concluídas"
          value={stats.tasksDone}
          hint={`de ${stats.tasksCreated} criadas no período`}
          sparkline={sparkTasksDone}
          sparklineTone="success"
        />
        <KpiCard
          label="Chamados atendidos"
          value={stats.ticketsDone}
          hint="resolvidos no período"
          sparkline={sparkTicketsDone}
          sparklineTone="primary"
        />
        <KpiCard
          label="Projetos em andamento"
          value={stats.ongoing}
          hint="snapshot atual"
        />
        <KpiCard
          label="Produtividade"
          value={`${stats.productivity}%`}
          delta={productivityDelta}
          deltaLabel="pp vs. período anterior"
          hint={
            stats.tasksCreated === 0
              ? "sem tarefas criadas no período"
              : `${stats.tasksDone}/${stats.tasksCreated} concluídas`
          }
        />
      </div>

      <SectionShell title="Produtividade do período" id="produtividade-periodo">
        <Progress value={stats.productivity} />
        <div className="mt-2 text-xs text-muted-foreground">
          {stats.tasksDone} de {stats.tasksCreated} tarefas concluídas
        </div>
      </SectionShell>

      <SectionShell
        title="Atividade no ano"
        description={`Tarefas e chamados concluídos por mês — ${year}`}
        id="atividade-ano"
        contentClassName="h-72"
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={12} />
            <YAxis
              stroke="var(--muted-foreground)"
              fontSize={12}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                background: "var(--popover)",
                border: "1px solid var(--border)",
                borderRadius: 8,
              }}
            />
            <Bar dataKey="Tarefas" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Chamados" fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </SectionShell>
    </div>
  );
}
