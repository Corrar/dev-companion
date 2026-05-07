import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useLocalStorage, uid, type Ticket, type TicketStatus, type Priority } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Plus, Pencil, Check, Trash2, Search } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/tickets")({
  head: () => ({ meta: [{ title: "Chamados — DevHub" }] }),
  component: TicketsPage,
});

const statusLabel: Record<TicketStatus, string> = { aberto: "Aberto", andamento: "Em andamento", concluido: "Concluído" };
const priorityLabel: Record<Priority, string> = { baixa: "Baixa", media: "Média", alta: "Alta" };
const priorityClass: Record<Priority, string> = {
  baixa: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  media: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  alta: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
};
const statusClass: Record<TicketStatus, string> = {
  aberto: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  andamento: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
  concluido: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
};

function TicketsPage() {
  const [tickets, setTickets] = useLocalStorage<Ticket[]>("tickets", []);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Ticket | null>(null);
  const [form, setForm] = useState<{ title: string; status: TicketStatus; priority: Priority }>({
    title: "", status: "aberto", priority: "media",
  });

  const filtered = useMemo(
    () => tickets.filter((t) => t.title.toLowerCase().includes(search.toLowerCase())),
    [tickets, search]
  );

  const openNew = () => {
    setEditing(null);
    setForm({ title: "", status: "aberto", priority: "media" });
    setOpen(true);
  };
  const openEdit = (t: Ticket) => {
    setEditing(t);
    setForm({ title: t.title, status: t.status, priority: t.priority });
    setOpen(true);
  };

  const save = () => {
    if (!form.title.trim()) return toast.error("Informe um título");
    if (editing) {
      setTickets((prev) => prev.map((t) => t.id === editing.id ? {
        ...t, ...form,
        completedAt: form.status === "concluido" && t.status !== "concluido" ? new Date().toISOString() : t.completedAt,
      } : t));
      toast.success("Chamado atualizado");
    } else {
      setTickets((prev) => [{
        id: uid(), ...form,
        createdAt: new Date().toISOString(),
        completedAt: form.status === "concluido" ? new Date().toISOString() : undefined,
      }, ...prev]);
      toast.success("Chamado criado");
    }
    setOpen(false);
  };

  const complete = (id: string) =>
    setTickets((prev) => prev.map((t) => t.id === id ? { ...t, status: "concluido", completedAt: new Date().toISOString() } : t));

  const remove = (id: string) => setTickets((prev) => prev.filter((t) => t.id !== id));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Chamados</h1>
          <p className="text-sm text-muted-foreground">Acompanhe seus tickets.</p>
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
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={form.status} onValueChange={(v: TicketStatus) => setForm({ ...form, status: v })}>
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
            <CardContent className="flex flex-wrap items-center gap-3 p-4">
              <div className="flex-1 min-w-[200px]">
                <div className="font-medium">{t.title}</div>
                <div className="text-xs text-muted-foreground">{new Date(t.createdAt).toLocaleDateString("pt-BR")}</div>
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
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
