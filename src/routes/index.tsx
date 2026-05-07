import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useLocalStorage, type Ticket, type ProjectTask } from "@/lib/storage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Ticket as TicketIcon, FolderKanban, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Desempenho do Mês — DevHub" },
      { name: "description", content: "Resumo mensal de produtividade." },
    ],
  }),
  component: Dashboard,
});

const monthNames = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

function Dashboard() {
  const [tickets] = useLocalStorage<Ticket[]>("tickets", []);
  const [tasks] = useLocalStorage<ProjectTask[]>("projects", []);
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const year = now.getFullYear();

  const inMonth = (iso?: string) => {
    if (!iso) return false;
    const d = new Date(iso);
    return d.getMonth() === month && d.getFullYear() === year;
  };

  const stats = useMemo(() => {
    const tasksDone = tasks.filter((t) => t.column === "done" && inMonth(t.completedAt)).length;
    const tasksCreated = tasks.filter((t) => inMonth(t.createdAt)).length;
    const ticketsDone = tickets.filter((t) => t.status === "concluido" && inMonth(t.completedAt)).length;
    const ticketsTotal = tickets.filter((t) => inMonth(t.createdAt)).length;
    const ongoing = tasks.filter((t) => t.column !== "done").length;
    const productivity = tasksCreated > 0 ? Math.round((tasksDone / tasksCreated) * 100) : 0;
    return { tasksDone, tasksCreated, ticketsDone, ticketsTotal, ongoing, productivity };
  }, [tickets, tasks, month]);

  const chartData = useMemo(() => {
    return Array.from({ length: 12 }, (_, m) => ({
      name: monthNames[m],
      Tarefas: tasks.filter((t) => t.column === "done" && t.completedAt && new Date(t.completedAt).getMonth() === m && new Date(t.completedAt).getFullYear() === year).length,
      Chamados: tickets.filter((t) => t.status === "concluido" && t.completedAt && new Date(t.completedAt).getMonth() === m && new Date(t.completedAt).getFullYear() === year).length,
    }));
  }, [tickets, tasks, year]);

  const cards = [
    { label: "Tarefas concluídas", value: stats.tasksDone, icon: CheckCircle2, accent: "text-emerald-500" },
    { label: "Chamados atendidos", value: stats.ticketsDone, icon: TicketIcon, accent: "text-blue-500" },
    { label: "Projetos em andamento", value: stats.ongoing, icon: FolderKanban, accent: "text-amber-500" },
    { label: "Produtividade", value: `${stats.productivity}%`, icon: TrendingUp, accent: "text-violet-500" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Desempenho do Mês</h1>
          <p className="text-sm text-muted-foreground">Resumo da sua produtividade.</p>
        </div>
        <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            {monthNames.map((m, i) => (
              <SelectItem key={i} value={String(i)}>{m} / {year}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardContent className="flex items-center gap-4 p-5">
              <div className={`rounded-lg bg-muted p-3 ${c.accent}`}>
                <c.icon className="h-5 w-5" />
              </div>
              <div>
                <div className="text-2xl font-semibold">{c.value}</div>
                <div className="text-xs text-muted-foreground">{c.label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Produtividade do mês</CardTitle>
        </CardHeader>
        <CardContent>
          <Progress value={stats.productivity} />
          <div className="mt-2 text-xs text-muted-foreground">
            {stats.tasksDone} de {stats.tasksCreated} tarefas concluídas
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Atividade no ano</CardTitle>
        </CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={12} />
              <YAxis stroke="var(--muted-foreground)" fontSize={12} allowDecimals={false} />
              <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
              <Bar dataKey="Tarefas" fill="var(--chart-1)" radius={[4,4,0,0]} />
              <Bar dataKey="Chamados" fill="var(--chart-2)" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
