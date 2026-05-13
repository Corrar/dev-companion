import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocalStorage, type Ticket, type ProjectTask } from "@/lib/storage";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  CalendarIcon,
  Sparkles,
  Rocket,
  Ticket as TicketIcon,
  ArrowRight,
  Trophy,
  TrendingUp,
  Flame,
  Target,
  Activity,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import {
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Area,
  AreaChart,
  Legend,
} from "recharts";
import { gsap } from "gsap";
import { cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker";
import { SectionShell } from "@/components/design-system";
import { AnimatedNumber } from "@/components/AnimatedNumber";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — DevHub" },
      { name: "description", content: "Painel moderno com indicadores e atividade do mês." },
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

function bucketByDay(iso: (string | undefined)[], from: Date, to: Date): number[] {
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

  // Mounted flag avoids SSR/CSR mismatch on time-derived strings (greeting).
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const now = useMemo(() => new Date(), []);
  const [range, setRange] = useState<DateRange | undefined>(() => {
    const d = new Date();
    return {
      from: new Date(d.getFullYear(), d.getMonth(), 1),
      to: new Date(d.getFullYear(), d.getMonth() + 1, 0),
    };
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
    const tasksDone = tasks.filter((t) => t.column === "done" && inRange(t.completedAt)).length;
    const tasksCreated = tasks.filter((t) => inRange(t.createdAt)).length;
    const ticketsDone = tickets.filter((t) => t.status === "concluido" && inRange(t.completedAt)).length;
    const ongoing = tasks.filter((t) => t.column !== "done").length;
    const productivity = tasksCreated > 0 ? Math.round((tasksDone / tasksCreated) * 100) : 0;
    return { tasksDone, tasksCreated, ticketsDone, ongoing, productivity };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tickets, tasks, range]);

  const previousProductivity = useMemo(() => {
    if (!range?.from) return undefined;
    const span = (range.to ?? range.from).getTime() - range.from.getTime() + 86_400_000;
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

  const productivityDelta =
    previousProductivity !== undefined ? stats.productivity - previousProductivity : undefined;

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
    if (!mounted) return "Olá";
    const h = new Date().getHours();
    if (h < 12) return "Bom dia";
    if (h < 18) return "Boa tarde";
    return "Boa noite";
  })();

  // ===== GSAP master timeline (entrance) =====
  const rootRef = useRef<HTMLDivElement | null>(null);
  const heroRef = useRef<HTMLElement | null>(null);
  const blob1Ref = useRef<HTMLDivElement | null>(null);
  const blob2Ref = useRef<HTMLDivElement | null>(null);
  const progressBarRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!mounted || !rootRef.current) return;
    const ctx = gsap.context(() => {
      // Hero text staggered entrance
      gsap.from(".gsap-hero-item", {
        y: 24,
        opacity: 0,
        duration: 0.8,
        ease: "power3.out",
        stagger: 0.08,
      });

      // Decorative blobs continuous drift (subtle, layered on top of CSS keyframes)
      gsap.to([blob1Ref.current, blob2Ref.current], {
        x: "+=20",
        y: "-=10",
        duration: 6,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
        stagger: 0.5,
      });

      // KPI cards entrance
      gsap.from(".gsap-kpi", {
        y: 30,
        opacity: 0,
        scale: 0.96,
        duration: 0.7,
        ease: "back.out(1.4)",
        stagger: 0.08,
        delay: 0.15,
      });

      // Insights entrance
      gsap.from(".gsap-insight", {
        y: 20,
        opacity: 0,
        duration: 0.6,
        ease: "power2.out",
        stagger: 0.06,
        delay: 0.35,
      });

      // Section shells entrance
      gsap.from(".gsap-section", {
        y: 30,
        opacity: 0,
        duration: 0.8,
        ease: "power3.out",
        stagger: 0.1,
        delay: 0.45,
      });
    }, rootRef);
    return () => ctx.revert();
  }, [mounted]);

  // Animate the productivity bar width when value changes
  useEffect(() => {
    if (!progressBarRef.current) return;
    gsap.to(progressBarRef.current, {
      width: `${stats.productivity}%`,
      duration: 1.2,
      ease: "power3.out",
    });
  }, [stats.productivity]);

  // ===== Insights computed =====
  const sparkTasksDone = useMemo(() => {
    if (!range?.from) return [];
    return bucketByDay(
      tasks.filter((t) => t.column === "done").map((t) => t.completedAt),
      range.from,
      range.to ?? range.from,
    );
  }, [tasks, range]);

  const days = sparkTasksDone;
  const totalDays = days.length || 1;
  const sumTasks = days.reduce((a, b) => a + b, 0);
  const avgPerDay = sumTasks / totalDays;
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

  const kpis = [
    {
      key: "td",
      label: "Tarefas concluídas",
      value: stats.tasksDone,
      hint: `de ${stats.tasksCreated} criadas no período`,
      icon: Activity,
      tone: "from-chart-1/25 to-chart-1/0",
      iconTone: "text-chart-1",
    },
    {
      key: "ca",
      label: "Chamados atendidos",
      value: stats.ticketsDone,
      hint: "resolvidos no período",
      icon: TicketIcon,
      tone: "from-chart-2/25 to-chart-2/0",
      iconTone: "text-chart-2",
    },
    {
      key: "pa",
      label: "Projetos em andamento",
      value: stats.ongoing,
      hint: "snapshot atual",
      icon: Rocket,
      tone: "from-chart-5/25 to-chart-5/0",
      iconTone: "text-chart-5",
    },
    {
      key: "pr",
      label: "Produtividade",
      value: stats.productivity,
      suffix: "%",
      hint:
        stats.tasksCreated === 0
          ? "sem tarefas criadas"
          : `${stats.tasksDone}/${stats.tasksCreated} concluídas`,
      icon: TrendingUp,
      tone: "from-primary/30 to-primary/0",
      iconTone: "text-primary",
      delta: productivityDelta,
    },
  ];

  return (
    <div ref={rootRef} className="space-y-8">
      {/* ===== Hero ===== */}
      <section
        ref={heroRef}
        className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary/15 via-accent/10 to-chart-2/15 animate-hero-gradient p-6 sm:p-10 shadow-elevated"
      >
        {/* Grid overlay */}
        <div className="pointer-events-none absolute inset-0 opacity-40 bg-grid-pattern [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]" />
        {/* Blobs */}
        <div
          ref={blob1Ref}
          className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-primary/30 blur-3xl"
        />
        <div
          ref={blob2Ref}
          className="pointer-events-none absolute -bottom-24 -left-16 h-80 w-80 rounded-full bg-chart-2/25 blur-3xl"
        />

        <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl space-y-4">
            <span className="gsap-hero-item inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/60 px-3 py-1 text-xs font-medium backdrop-blur">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-primary animate-pulse-ring" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
              </span>
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              {greeting}, dev — pronto pra render?
            </span>
            <h1 className="gsap-hero-item text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
              Seu cockpit{" "}
              <span className="text-gradient-primary">de produtividade</span>
            </h1>
            <p className="gsap-hero-item text-sm text-muted-foreground sm:text-base">
              Acompanhe tarefas, chamados e o ritmo do mês — tudo num só lugar,
              rápido e sem fricção.
            </p>
            <div className="gsap-hero-item flex flex-wrap gap-2 pt-2">
              <Button asChild size="sm" className="gap-2 hover-lift">
                <Link to="/projects">
                  <Rocket className="h-4 w-4" />
                  Ver projetos
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="sm" variant="outline" className="gap-2 hover-lift backdrop-blur">
                <Link to="/tickets">
                  <TicketIcon className="h-4 w-4" />
                  Abrir chamado
                </Link>
              </Button>
            </div>
          </div>

          {/* Mini destaques (glass) */}
          <div className="gsap-hero-item grid w-full max-w-sm grid-cols-3 gap-3">
            {[
              { label: "Tarefas", value: stats.tasksDone },
              { label: "Chamados", value: stats.ticketsDone },
              { label: "Produtividade", value: stats.productivity, suffix: "%" },
            ].map((m) => (
              <div
                key={m.label}
                className="glass-card hover-lift rounded-2xl p-4 text-center"
              >
                <div className="text-2xl font-bold tabular-nums text-gradient-primary">
                  <AnimatedNumber value={m.value} suffix={m.suffix ?? ""} />
                </div>
                <div className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                  {m.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Period selector ===== */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Desempenho do Período</h2>
          <p className="text-sm text-muted-foreground">Resumo da sua produtividade.</p>
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

      {/* ===== KPI grid ===== */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <div
            key={k.key}
            className={cn(
              "gsap-kpi group relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-card hover-lift",
              "before:absolute before:inset-0 before:bg-gradient-to-br before:opacity-60 before:transition-opacity before:duration-300",
              "group-hover:before:opacity-100",
              k.tone,
            )}
          >
            <div
              className={cn(
                "pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full blur-3xl opacity-50 transition-opacity duration-500 group-hover:opacity-90",
                "bg-gradient-to-br",
                k.tone,
              )}
            />
            <div className="relative flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  {k.label}
                </div>
                <div className="text-3xl font-bold tabular-nums">
                  <AnimatedNumber value={k.value} suffix={k.suffix ?? ""} />
                </div>
                <div className="text-xs text-muted-foreground">{k.hint}</div>
                {typeof k.delta === "number" && (
                  <div
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
                      k.delta >= 0
                        ? "bg-status-done-bg text-status-done"
                        : "bg-status-pending-bg text-status-pending",
                    )}
                  >
                    {k.delta >= 0 ? "▲" : "▼"} {Math.abs(k.delta)}pp
                  </div>
                )}
              </div>
              <div
                className={cn(
                  "rounded-xl bg-background/60 p-2 backdrop-blur transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3",
                  k.iconTone,
                )}
              >
                <k.icon className="h-5 w-5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ===== Insights ===== */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { icon: Trophy, label: "Melhor dia", value: bestVal > 0 ? `${bestVal} em ${bestDate}` : "—", tone: "text-chart-4" },
          { icon: Flame, label: "Sequência", value: streak > 0 ? `${streak} dia${streak > 1 ? "s" : ""}` : "0 dias", tone: "text-priority-urgent" },
          { icon: TrendingUp, label: "Média/dia", value: avgPerDay.toFixed(1), tone: "text-chart-2" },
          { icon: Target, label: "Meta período", value: `${Math.min(stats.productivity, 100)}%`, tone: "text-primary" },
        ].map((it) => (
          <div
            key={it.label}
            className="gsap-insight group flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-card hover-lift"
          >
            <div className={cn("rounded-xl bg-muted p-2.5 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3", it.tone)}>
              <it.icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{it.label}</div>
              <div className="truncate text-base font-semibold tabular-nums">{it.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ===== Productivity bar ===== */}
      <div className="gsap-section">
        <SectionShell title="Produtividade do período" id="produtividade-periodo">
          <div className="space-y-3">
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-bold tabular-nums text-gradient-primary">
                <AnimatedNumber value={stats.productivity} suffix="%" />
              </span>
              <span className="text-xs text-muted-foreground">
                {stats.tasksDone} de {stats.tasksCreated} tarefas concluídas
              </span>
            </div>
            <div className="relative h-3 overflow-hidden rounded-full bg-muted">
              <div
                ref={progressBarRef}
                className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-primary via-chart-2 to-chart-5 shadow-[0_0_20px_-2px_var(--primary)]"
                style={{ width: 0 }}
              />
            </div>
          </div>
        </SectionShell>
      </div>

      {/* ===== Yearly chart ===== */}
      <div className="gsap-section">
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
                  <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.6} />
                  <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gChamados" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.6} />
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
                  borderRadius: 12,
                  boxShadow: "var(--shadow-elevated)",
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area
                type="monotone"
                dataKey="Tarefas"
                stroke="var(--chart-1)"
                strokeWidth={2.5}
                fill="url(#gTarefas)"
                activeDot={{ r: 6 }}
                animationDuration={1200}
              />
              <Area
                type="monotone"
                dataKey="Chamados"
                stroke="var(--chart-2)"
                strokeWidth={2.5}
                fill="url(#gChamados)"
                activeDot={{ r: 6 }}
                animationDuration={1200}
              />
            </AreaChart>
          </ResponsiveContainer>
        </SectionShell>
      </div>
    </div>
  );
}
