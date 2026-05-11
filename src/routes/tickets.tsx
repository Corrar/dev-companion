import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import {
  useLocalStorage,
  uid,
  type Ticket,
  type TicketStatus,
  type Priority,
  type TicketAttachment,
} from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Plus,
  Pencil,
  Check,
  Trash2,
  Search,
  Building2,
  Paperclip,
  LinkIcon,
  X,
  Image as ImageIcon,
  Eye,
  Printer,
  User,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/tickets")({
  head: () => ({ meta: [{ title: "Chamados — DevHub" }] }),
  component: TicketsPage,
});

const statusLabel: Record<TicketStatus, string> = {
  espera: "Em espera",
  aceita: "Aceita",
  desenvolvimento: "Em desenvolvimento",
  concluido: "Concluído",
};
const statusProgress: Record<TicketStatus, number> = {
  espera: 0,
  aceita: 33,
  desenvolvimento: 66,
  concluido: 100,
};
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

const SECTORS = [
  "Suporte",
  "Desenvolvimento",
  "Infraestrutura",
  "QA",
  "Produto",
  "Comercial",
  "Financeiro",
];

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const isValidUrl = (s: string) => {
  try {
    new URL(s);
    return true;
  } catch {
    return false;
  }
};

type FormState = {
  title: string;
  description: string;
  status: TicketStatus;
  priority: Priority;
  sector: string;
  links: string[];
  attachments: TicketAttachment[];
};

const emptyForm = (): FormState => ({
  title: "",
  description: "",
  status: "espera",
  priority: "media",
  sector: SECTORS[0],
  links: [],
  attachments: [],
});

function TicketsPage() {
  const [tickets, setTickets] = useLocalStorage<Ticket[]>("tickets", []);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Ticket | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [linkInput, setLinkInput] = useState("");
  const [view, setView] = useState<Ticket | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(
    () =>
      tickets.filter((t) => {
        const q = search.toLowerCase();
        return (
          t.title.toLowerCase().includes(q) ||
          (t.description ?? "").toLowerCase().includes(q)
        );
      }),
    [tickets, search],
  );

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm());
    setLinkInput("");
    setOpen(true);
  };
  const openEdit = (t: Ticket) => {
    setEditing(t);
    setForm({
      title: t.title,
      description: t.description ?? "",
      status: t.status,
      priority: t.priority,
      sector: t.sector ?? SECTORS[0],
      links: t.links ?? [],
      attachments: t.attachments ?? [],
    });
    setLinkInput("");
    setOpen(true);
  };

  const addLink = () => {
    const v = linkInput.trim();
    if (!v) return;
    if (!isValidUrl(v)) return toast.error("URL inválida");
    setForm((f) => ({ ...f, links: [...f.links, v] }));
    setLinkInput("");
  };

  const removeLink = (i: number) =>
    setForm((f) => ({ ...f, links: f.links.filter((_, idx) => idx !== i) }));

  const handleFiles = async (files: FileList | null) => {
    if (!files) return;
    const next: TicketAttachment[] = [];
    for (const file of Array.from(files)) {
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name}: máx 2MB`);
        continue;
      }
      const dataUrl = await new Promise<string>((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result as string);
        r.onerror = rej;
        r.readAsDataURL(file);
      });
      next.push({ id: uid(), name: file.name, dataUrl, type: file.type, size: file.size });
    }
    if (next.length) setForm((f) => ({ ...f, attachments: [...f.attachments, ...next] }));
    if (fileRef.current) fileRef.current.value = "";
  };

  const removeAttachment = (id: string) =>
    setForm((f) => ({ ...f, attachments: f.attachments.filter((a) => a.id !== id) }));

  const save = () => {
    if (!form.title.trim()) return toast.error("Informe um título");
    if (!form.description.trim()) return toast.error("Descreva o problema");
    const progress = statusProgress[form.status];
    if (editing) {
      setTickets((prev) =>
        prev.map((t) =>
          t.id === editing.id
            ? {
                ...t,
                ...form,
                progress,
                completedAt:
                  form.status === "concluido" && t.status !== "concluido"
                    ? new Date().toISOString()
                    : t.completedAt,
              }
            : t,
        ),
      );
      toast.success("Chamado atualizado");
    } else {
      const newTicket: Ticket = {
        id: uid(),
        ...form,
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
    setTickets((prev) =>
      prev.map((t) =>
        t.id === id
          ? { ...t, status: "concluido", progress: 100, completedAt: new Date().toISOString() }
          : t,
      ),
    );

  const remove = (id: string) => setTickets((prev) => prev.filter((t) => t.id !== id));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Chamados</h1>
          <p className="text-sm text-muted-foreground">
            Descreva o problema com detalhes — anexe imagens e links de referência.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 w-56"
            />
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={openNew}>
                <Plus className="h-4 w-4" /> Novo
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editing ? "Editar chamado" : "Novo chamado"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Título *</Label>
                  <Input
                    placeholder="Resumo do problema"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Descrição detalhada *</Label>
                  <Textarea
                    placeholder="O que está acontecendo? Passos para reproduzir, comportamento esperado, mensagens de erro..."
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="min-h-32"
                  />
                  <p className="text-xs text-muted-foreground">
                    Quanto mais detalhes, mais rápido o setor consegue resolver.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Setor responsável</Label>
                  <Select
                    value={form.sector}
                    onValueChange={(v) => setForm({ ...form, sector: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SECTORS.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                      value={form.status}
                      onValueChange={(v: TicketStatus) => setForm({ ...form, status: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(statusLabel) as TicketStatus[]).map((s) => (
                          <SelectItem key={s} value={s}>
                            {statusLabel[s]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Prioridade</Label>
                    <Select
                      value={form.priority}
                      onValueChange={(v: Priority) => setForm({ ...form, priority: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(priorityLabel) as Priority[]).map((p) => (
                          <SelectItem key={p} value={p}>
                            {priorityLabel[p]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Progresso (automático)</Label>
                    <span className="text-sm tabular-nums text-muted-foreground">
                      {statusProgress[form.status]}%
                    </span>
                  </div>
                  <Progress value={statusProgress[form.status]} />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <LinkIcon className="h-4 w-4" /> Links de referência
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="https://..."
                      value={linkInput}
                      onChange={(e) => setLinkInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addLink();
                        }
                      }}
                    />
                    <Button type="button" variant="secondary" onClick={addLink}>
                      Adicionar
                    </Button>
                  </div>
                  {form.links.length > 0 && (
                    <ul className="space-y-1">
                      {form.links.map((l, i) => (
                        <li
                          key={i}
                          className="flex items-center gap-2 rounded-md border bg-muted/30 px-2 py-1 text-sm"
                        >
                          <LinkIcon className="h-3 w-3 shrink-0 text-muted-foreground" />
                          <a
                            href={l}
                            target="_blank"
                            rel="noreferrer"
                            className="flex-1 truncate text-primary hover:underline"
                          >
                            {l}
                          </a>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            onClick={() => removeLink(i)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Paperclip className="h-4 w-4" /> Anexos (imagens, máx 2MB)
                  </Label>
                  <input
                    ref={fileRef}
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => handleFiles(e.target.files)}
                    className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-sm file:text-secondary-foreground hover:file:bg-secondary/80"
                  />
                  {form.attachments.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                      {form.attachments.map((a) => (
                        <div
                          key={a.id}
                          className="group relative overflow-hidden rounded-md border"
                        >
                          {a.type.startsWith("image/") ? (
                            <img
                              src={a.dataUrl}
                              alt={a.name}
                              className="h-20 w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-20 items-center justify-center bg-muted">
                              <ImageIcon className="h-6 w-6 text-muted-foreground" />
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => removeAttachment(a.id)}
                            className="absolute right-1 top-1 rounded-full bg-background/80 p-1 opacity-0 transition group-hover:opacity-100"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={save}>Salvar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            Nenhum chamado.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((t) => {
            const imgs = (t.attachments ?? []).filter((a) => a.type.startsWith("image/"));
            return (
              <Card key={t.id} className="flex flex-col overflow-hidden">
                {imgs[0] && (
                  <button
                    type="button"
                    onClick={() => setView(t)}
                    className="relative block aspect-video overflow-hidden bg-muted"
                  >
                    <img
                      src={imgs[0].dataUrl}
                      alt={imgs[0].name}
                      className="h-full w-full object-cover transition group-hover:scale-105"
                    />
                    {imgs.length > 1 && (
                      <span className="absolute right-2 top-2 rounded-full bg-background/80 px-2 py-0.5 text-xs">
                        +{imgs.length - 1}
                      </span>
                    )}
                  </button>
                )}
                <CardContent className="flex flex-1 flex-col gap-3 p-4">
                  <div className="space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-medium leading-snug">{t.title}</h3>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <Building2 className="h-3 w-3" />
                      <span>{t.sector ?? "—"}</span>
                      <span>•</span>
                      <span>{new Date(t.createdAt).toLocaleDateString("pt-BR")}</span>
                    </div>
                  </div>

                  {t.description && (
                    <p className="line-clamp-3 text-sm text-muted-foreground">{t.description}</p>
                  )}

                  <div className="flex flex-wrap gap-1.5">
                    <Badge className={priorityClass[t.priority]} variant="secondary">
                      {priorityLabel[t.priority]}
                    </Badge>
                    <Badge className={statusClass[t.status]} variant="secondary">
                      {statusLabel[t.status]}
                    </Badge>
                    {(t.links?.length ?? 0) > 0 && (
                      <Badge variant="outline" className="gap-1">
                        <LinkIcon className="h-3 w-3" />
                        {t.links!.length}
                      </Badge>
                    )}
                    {(t.attachments?.length ?? 0) > 0 && (
                      <Badge variant="outline" className="gap-1">
                        <Paperclip className="h-3 w-3" />
                        {t.attachments!.length}
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Progresso</span>
                      <span className="tabular-nums">{t.progress ?? 0}%</span>
                    </div>
                    <Progress value={t.progress ?? 0} />
                  </div>

                  <div className="mt-auto flex justify-end gap-1 pt-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setView(t)}
                      title="Ver detalhes"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    {t.status !== "concluido" && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => complete(t.id)}
                        title="Concluir"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
                    <Button size="icon" variant="ghost" onClick={() => openEdit(t)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => remove(t.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!view} onOpenChange={(o) => !o && setView(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          {view && (
            <>
              <DialogHeader>
                <DialogTitle>{view.title}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <Building2 className="h-3 w-3" />
                  <span>{view.sector}</span>
                  <span>•</span>
                  <span>{new Date(view.createdAt).toLocaleString("pt-BR")}</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Badge className={priorityClass[view.priority]} variant="secondary">
                    {priorityLabel[view.priority]}
                  </Badge>
                  <Badge className={statusClass[view.status]} variant="secondary">
                    {statusLabel[view.status]}
                  </Badge>
                </div>
                {view.description && (
                  <div>
                    <Label className="mb-1 block">Descrição</Label>
                    <p className="whitespace-pre-wrap rounded-md border bg-muted/30 p-3 text-sm">
                      {view.description}
                    </p>
                  </div>
                )}
                {(view.links?.length ?? 0) > 0 && (
                  <div>
                    <Label className="mb-1 block">Links</Label>
                    <ul className="space-y-1">
                      {view.links!.map((l, i) => (
                        <li key={i} className="text-sm">
                          <a
                            href={l}
                            target="_blank"
                            rel="noreferrer"
                            className="text-primary hover:underline"
                          >
                            {l}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {(view.attachments?.length ?? 0) > 0 && (
                  <div>
                    <Label className="mb-1 block">Anexos</Label>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {view.attachments!.map((a) => (
                        <a
                          key={a.id}
                          href={a.dataUrl}
                          target="_blank"
                          rel="noreferrer"
                          download={a.name}
                          className="block overflow-hidden rounded-md border"
                        >
                          {a.type.startsWith("image/") ? (
                            <img
                              src={a.dataUrl}
                              alt={a.name}
                              className="h-32 w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-32 items-center justify-center bg-muted">
                              <ImageIcon className="h-6 w-6 text-muted-foreground" />
                            </div>
                          )}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Progresso</span>
                    <span className="tabular-nums">{view.progress}%</span>
                  </div>
                  <Progress value={view.progress} />
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
