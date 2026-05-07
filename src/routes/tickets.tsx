import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useLocalStorage, uid, type Ticket, type TicketStatus, type Priority } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Plus, Pencil, Check, Trash2, Search, Building2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/tickets")({
  head: () => ({ meta: [{ title: "Chamados — DevHub" }] }),
  component: TicketsPage,
});

const statusLabel: Record<TicketStatus, string> = { espera: "Em espera", aceita: "Aceita", desenvolvimento: "Em desenvolvimento", concluido: "Concluído" };
const statusProgress: Record<TicketStatus, number> = { espera: 0, aceita: 33, desenvolvimento: 66, concluido: 100 };
const priorityLabel: Record<Priority, string> = { baixa: "Baixa", media: "Média", alta: "Alta" };
const priorityClass: Record<Priority, string> = {
  baixa: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  media: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  alta: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
};
const statusClass: Record<TicketStatus, string> = {
  espera: "bg-slate-500/15 text-slate-600 dark:text-slate-400",
  aceita: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  desenvolvimento: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
  concluido: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
};

const SECTORS = ["Suporte", "Desenvolvimento", "Infraestrutura", "QA", "Produto", "Comercial", "Financeiro"];

type FormState = { title: string; status: TicketStatus; priority: Priority; sector: string; progress: number };

function TicketsPage() {
  const [tickets, setTickets] = useLocalStorage<Ticket[]>("tickets", []);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Ticket | null>(null);
  const [form, setForm] = useState<FormState>({
    title: "", status: "aberto", priority: "media", sector: SECTORS[0], progress: 0,
  });

  const filtered = useMemo(
    () => tickets.filter((t) => t.title.toLowerCase().includes(search.toLowerCase())),
    [tickets, search]
  );

  const openNew = () => {
    setEditing(null);
    setForm({ title: "", status: "aberto", priority: "media", sector: SECTORS[0], progress: 0 });
    setOpen(true);
  };
  const openEdit = (t: Ticket) => {
    setEditing(t);
    setForm({ title: t.title, status: t.status, priority: t.priority, sector: t.sector ?? SECTORS[0], progress: t.progress ?? 0 });
    setOpen(true);
  };

  const save = () => {
    if (!form.title.trim()) return toast.error("Informe um título");
    const progress = form.status === "concluido" ? 100 : form.status === "aberto" ? Math.min(form.progress, 25) : form.progress;
    if (editing) {
      setTickets((prev) => prev.map((t) => t.id === editing.id ? {
        ...t, ...form, progress,
        completedAt: form.status === "concluido" && t.status !== "concluido" ? new Date().toISOString() : t.completedAt,
      } : t));
      toast.success("Chamado atualizado");
    } else {
      const newTicket: Ticket = {
        id: uid(),
        title: form.title,
        status: form.status,
        priority: form.priority,
        sector: form.sector,
        progress,
        createdAt: new Date().toISOString(),
        completedAt: form.status === "concluido" ? new Date().toISOString() : undefined,
      };
      setTickets((prev) => [newTicket, ...prev]);
      toast.success(`Chamado encaminhado ao setor ${form.sector}`);
    }
    setOpen(false);
  };

  const complete = (id: string) =>
    setTickets((prev) => prev.map((t) => t.id === id ? { ...t, status: "concluido", progress: 100, completedAt: new Date().toISOString() } : t));

  const remove = (id: string) => setTickets((prev) => prev.filter((t) => t.id !== id));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Chamados</h1>
          <p className="text-sm text-muted-foreground">Acompanhe seus tickets e o setor responsável.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 w-56" />
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={openNew}><Plus className="h-4 w-4" /> Novo</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editing ? "Editar chamado" : "Novo chamado"}</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Título</Label>
                  <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Setor responsável</Label>
                  <Select value={form.sector} onValueChange={(v) => setForm({ ...form, sector: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SECTORS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">O chamado será encaminhado a este setor.</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={form.status} onValueChange={(v: TicketStatus) => setForm({ ...form, status: v, progress: v === "concluido" ? 100 : v === "aberto" ? 0 : form.progress || 50 })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(Object.keys(statusLabel) as TicketStatus[]).map((s) => <SelectItem key={s} value={s}>{statusLabel[s]}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Prioridade</Label>
                    <Select value={form.priority} onValueChange={(v: Priority) => setForm({ ...form, priority: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(Object.keys(priorityLabel) as Priority[]).map((p) => <SelectItem key={p} value={p}>{priorityLabel[p]}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Progresso</Label>
                    <span className="text-sm tabular-nums text-muted-foreground">{form.progress}%</span>
                  </div>
                  <Slider value={[form.progress]} onValueChange={([v]) => setForm({ ...form, progress: v })} max={100} step={5} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button onClick={save}>Salvar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="space-y-2">
        {filtered.length === 0 && (
          <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Nenhum chamado.</CardContent></Card>
        )}
        {filtered.map((t) => (
          <Card key={t.id}>
            <CardContent className="space-y-3 p-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex-1 min-w-[200px]">
                  <div className="font-medium">{t.title}</div>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                    <Building2 className="h-3 w-3" />
                    <span>{t.sector ?? "—"}</span>
                    <span>•</span>
                    <span>{new Date(t.createdAt).toLocaleDateString("pt-BR")}</span>
                  </div>
                </div>
                <Badge className={priorityClass[t.priority]} variant="secondary">{priorityLabel[t.priority]}</Badge>
                <Badge className={statusClass[t.status]} variant="secondary">{statusLabel[t.status]}</Badge>
                <div className="flex gap-1">
                  {t.status !== "concluido" && (
                    <Button size="icon" variant="ghost" onClick={() => complete(t.id)} title="Concluir"><Check className="h-4 w-4" /></Button>
                  )}
                  <Button size="icon" variant="ghost" onClick={() => openEdit(t)}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => remove(t.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Progresso</span>
                  <span className="tabular-nums">{t.progress ?? 0}%</span>
                </div>
                <Progress value={t.progress ?? 0} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
