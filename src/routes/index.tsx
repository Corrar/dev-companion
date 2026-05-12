import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useLocalStorage, type Ticket, type ProjectTask } from "@/lib/storage";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Sparkles, Rocket, Ticket as TicketIcon, ArrowRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Area,
  AreaChart,
  Legend,
} from "recharts";
import { Trophy, TrendingUp, Flame, Target } from "lucide-react";
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

  const greeting = (() => {
    const h = now.getHours();
    if (h < 12) return "Bom dia";
    if (h < 18) return "Boa tarde";
    return "Boa noite";
  })();

  return (
    <div className="space-y-6">
      {/* ===== Hero ===== */}
      <section
        className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary/15 via-accent/10 to-chart-2/15 animate-hero-gradient p-6 sm:p-10 shadow-elevated"
      >
        {/* Blobs decorativos */}
        <div className="pointer-events-none absolute -top-16 -right-16 h-64 w-64 rounded-full bg-primary/30 blur-3xl animate-float-blob" />
        <div className="pointer-events-none absolute -bottom-20 -left-10 h-72 w-72 rounded-full bg-chart-2/25 blur-3xl animate-float-blob delay-200" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl space-y-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/60 px-3 py-1 text-xs font-medium backdrop-blur animate-fade-up">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              {greeting}, dev — pronto pra render?
            </span>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl animate-fade-up delay-100">
              Seu cockpit{" "}
              <span className="bg-gradient-to-r from-primary via-chart-2 to-chart-4 bg-clip-text text-transparent">
                de produtividade
              </span>
            </h1>
            <p className="text-sm text-muted-foreground sm:text-base animate-fade-up delay-200">
              Acompanhe tarefas, chamados e o ritmo do mês — tudo num só lugar,
              rápido e sem fricção.
            </p>
            <div className="flex flex-wrap gap-2 pt-2 animate-fade-up delay-300">
              <Button asChild size="sm" className="gap-2 hover-lift">
                <Link to="/projects">
                  <Rocket className="h-4 w-4" />
                  Ver projetos
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="sm" variant="outline" className="gap-2 hover-lift">
                <Link to="/tickets">
                  <TicketIcon className="h-4 w-4" />
                  Abrir chamado
                </Link>
              </Button>
            </div>
          </div>

          {/* Mini destaques */}
          <div className="grid w-full max-w-sm grid-cols-3 gap-3 animate-fade-up delay-400">
            {[
              { label: "Tarefas", value: stats.tasksDone, tone: "from-chart-1/30 to-chart-1/5" },
              { label: "Chamados", value: stats.ticketsDone, tone: "from-chart-2/30 to-chart-2/5" },
              { label: "Produtividade", value: `${stats.productivity}%`, tone: "from-primary/30 to-primary/5" },
            ].map((m) => (
              <div
                key={m.label}
                className={cn(
                  "rounded-xl border border-border/60 bg-gradient-to-br p-3 text-center backdrop-blur hover-lift",
                  m.tone,
                )}
              >
                <div className="text-xl font-bold tabular-nums">{m.value}</div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {m.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3 animate-fade-up">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">
            Desempenho do Período
          </h2>
          <p className="text-sm text-muted-foreground">
            Resumo da sua produtividade.
          </p>
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "justify-start gap-2 text-left font-normal hover-lift",
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
        {[
          <KpiCard
            key="td"
            label="Tarefas concluídas"
            value={stats.tasksDone}
            hint={`de ${stats.tasksCreated} criadas no período`}
            sparkline={sparkTasksDone}
            sparklineTone="success"
          />,
          <KpiCard
            key="ca"
            label="Chamados atendidos"
            value={stats.ticketsDone}
            hint="resolvidos no período"
            sparkline={sparkTicketsDone}
            sparklineTone="primary"
          />,
          <KpiCard
            key="pa"
            label="Projetos em andamento"
            value={stats.ongoing}
            hint="snapshot atual"
          />,
          <KpiCard
            key="pr"
            label="Produtividade"
            value={`${stats.productivity}%`}
            delta={productivityDelta}
            deltaLabel="pp vs. período anterior"
            hint={
              stats.tasksCreated === 0
                ? "sem tarefas criadas no período"
                : `${stats.tasksDone}/${stats.tasksCreated} concluídas`
            }
          />,
        ].map((node, i) => (
          <div
            key={i}
            className={cn("animate-fade-up hover-lift", `delay-${(i + 1) * 100}`)}
          >
            {node}
          </div>
        ))}
      </div>

      {/* Insights rápidos */}
      {(() => {
        const days = sparkTasksDone ?? [];
        const totalDays = days.length || 1;
        const sumTasks = days.reduce((a, b) => a + b, 0);
        const avgPerDay = (sumTasks / totalDays).toFixed(1);
        const bestIdx = days.reduce((bi, v, i, arr) => (v > arr[bi] ? i : bi), 0);
        const bestDate =
          range?.from && days.length
            ? new Date(range.from.getTime() + bestIdx * 86_400_000).toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "short",
              })
            : "—";
        const bestVal = days[bestIdx] ?? 0;
        const streak = (() => {
          let s = 0;
          for (let i = days.length - 1; i >= 0; i--) {
            if (days[i] > 0) s++;
            else break;
          }
          return s;
        })();
        const insights = [
          { icon: Trophy, label: "Melhor dia", value: bestVal > 0 ? `${bestVal} em ${bestDate}` : "—", tone: "text-chart-4" },
          { icon: Flame, label: "Sequência", value: streak > 0 ? `${streak} dia${streak > 1 ? "s" : ""}` : "0 dias", tone: "text-priority-urgent" },
          { icon: TrendingUp, label: "Média/dia", value: avgPerDay, tone: "text-chart-2" },
          { icon: Target, label: "Meta período", value: `${Math.min(stats.productivity, 100)}%`, tone: "text-primary" },
        ];
        return (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {insights.map((it, i) => (
              <div
                key={it.label}
                className={cn(
                  "group flex items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-card hover-lift animate-fade-up",
                  `delay-${(i + 1) * 100}`,
                )}
              >
                <div className={cn("rounded-lg bg-muted p-2 transition-transform group-hover:scale-110", it.tone)}>
                  <it.icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{it.label}</div>
                  <div className="truncate text-base font-semibold tabular-nums">{it.value}</div>
                </div>
              </div>
            ))}
          </div>
        );
      })()}

      <SectionShell title="Produtividade do período" id="produtividade-periodo">
        <div className="space-y-3">
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-bold tabular-nums">{stats.productivity}%</span>
            <span className="text-xs text-muted-foreground">
              {stats.tasksDone} de {stats.tasksCreated} tarefas concluídas
            </span>
          </div>
          <div className="relative h-3 overflow-hidden rounded-full bg-muted">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-primary via-chart-2 to-chart-4 transition-[width] duration-700 ease-out"
              style={{ width: `${stats.productivity}%` }}
            />
          </div>
        </div>
      </SectionShell>

      <SectionShell
        title="Atividade no ano"
        description={`Tarefas e chamados concluídos por mês — ${year}`}
        id="atividade-ano"
        contentClassName="h-80"
      >
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 8, right: 12, bottom: 0, left: -10 }}>
            <defs>
              <linearGradient id="gTarefas" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.55} />
                <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gChamados" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.55} />
                <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={12} />
            <YAxis stroke="var(--muted-foreground)" fontSize={12} allowDecimals={false} />
            <Tooltip
              contentStyle={{
                background: "var(--popover)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                boxShadow: "var(--shadow-elevated)",
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Area
              type="monotone"
              dataKey="Tarefas"
              stroke="var(--chart-1)"
              strokeWidth={2}
              fill="url(#gTarefas)"
              activeDot={{ r: 5 }}
            />
            <Area
              type="monotone"
              dataKey="Chamados"
              stroke="var(--chart-2)"
              strokeWidth={2}
              fill="url(#gChamados)"
              activeDot={{ r: 5 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </SectionShell>
    </div>
  );
}
