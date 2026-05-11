import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
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
  Printer,
  User,
  TicketIcon,
} from "lucide-react";
import { toast } from "sonner";
import {
  SectionShell,
  StatusBadge,
  type StatusBadgeTone,
} from "@/components/design-system";
import { cn } from "@/lib/utils";

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
const statusTone: Record<TicketStatus, StatusBadgeTone> = {
  espera: "neutral",
  aceita: "info",
  desenvolvimento: "warning",
  concluido: "success",
};
const statusProgress: Record<TicketStatus, number> = {
  espera: 0,
  aceita: 33,
  desenvolvimento: 66,
  concluido: 100,
};
const priorityLabel: Record<Priority, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
};
const priorityTone: Record<Priority, StatusBadgeTone> = {
  baixa: "low",
  media: "medium",
  alta: "high",
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
  requester: string;
  status: TicketStatus;
  priority: Priority;
  sector: string;
  links: string[];
  attachments: TicketAttachment[];
};

const emptyForm = (): FormState => ({
  title: "",
  description: "",
  requester: "",
  status: "espera",
  priority: "media",
  sector: SECTORS[0]!,
  links: [],
  attachments: [],
});

type PriorityFilter = "all" | Priority;

const DRAFT_KEY = "tickets-new-draft";

function readDraft(): Pick<FormState, "title" | "description" | "requester" | "sector"> | null {
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeDraft(d: FormState) {
  try {
    window.localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({
        title: d.title,
        description: d.description,
        requester: d.requester,
        sector: d.sector,
      }),
    );
  } catch {
    /* ignora */
  }
}

function clearDraft() {
  try {
    window.localStorage.removeItem(DRAFT_KEY);
  } catch {
    /* ignora */
  }
}

function TicketsPage() {
  const [tickets, setTickets] = useLocalStorage<Ticket[]>("tickets", []);
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Ticket | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [submitted, setSubmitted] = useState(false);
  const [linkInput, setLinkInput] = useState("");
  const [view, setView] = useState<Ticket | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement | null>(null);

  // Auto-save draft (apenas no modo "novo", não em edição)
  useEffect(() => {
    if (!open || editing) return;
    const id = window.setTimeout(() => writeDraft(form), 500);
    return () => window.clearTimeout(id);
  }, [form, open, editing]);

  // Auto-grow do textarea de descrição
  useEffect(() => {
    const el = descriptionRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 320)}px`;
  }, [form.description, open]);

  const filtered = useMemo(
    () =>
      tickets.filter((t) => {
        const q = search.toLowerCase();
        const matchesSearch =
          t.title.toLowerCase().includes(q) ||
          (t.description ?? "").toLowerCase().includes(q) ||
          (t.requester ?? "").toLowerCase().includes(q);
        const matchesPriority =
          priorityFilter === "all" || t.priority === priorityFilter;
        return matchesSearch && matchesPriority;
      }),
    [tickets, search, priorityFilter],
  );

  const openNew = () => {
    setEditing(null);
    const draft = readDraft();
    setForm({
      ...emptyForm(),
      ...(draft ?? {}),
    });
    setSubmitted(false);
    setLinkInput("");
    setOpen(true);
  };
  const openEdit = (t: Ticket) => {
    setEditing(t);
    setForm({
      title: t.title,
      description: t.description ?? "",
      requester: t.requester ?? "",
      status: t.status,
      priority: t.priority,
      sector: t.sector ?? SECTORS[0]!,
      links: t.links ?? [],
      attachments: t.attachments ?? [],
    });
    setSubmitted(false);
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
      next.push({
        id: uid(),
        name: file.name,
        dataUrl,
        type: file.type,
        size: file.size,
      });
    }
    if (next.length) setForm((f) => ({ ...f, attachments: [...f.attachments, ...next] }));
    if (fileRef.current) fileRef.current.value = "";
  };

  const removeAttachment = (id: string) =>
    setForm((f) => ({ ...f, attachments: f.attachments.filter((a) => a.id !== id) }));

  // Validação inline derivada
  const titleError =
    submitted && !form.title.trim() ? "Título obrigatório." : undefined;
  const descError =
    submitted && !form.description.trim() ? "Descreva o problema." : undefined;
  const isValid = !!form.title.trim() && !!form.description.trim();

  const save = () => {
    setSubmitted(true);
    if (!isValid) {
      toast.error("Confira os campos destacados.");
      return;
    }
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
      clearDraft();
    }
    setOpen(false);
  };

  const handleDialogKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      save();
    }
  };

  const complete = (id: string) =>
    setTickets((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              status: "concluido",
              progress: 100,
              completedAt: new Date().toISOString(),
            }
          : t,
      ),
    );

  const remove = (id: string) => setTickets((prev) => prev.filter((t) => t.id !== id));

  const printList = () => {
    const escape = (s: string) =>
      s.replace(/[&<>"']/g, (c) =>
        ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
      );
    const rows = filtered
      .map(
        (t) => `
          <article class="ticket">
            <header>
              <h2>${escape(t.title)}</h2>
              <span class="badge p-${t.priority}">${priorityLabel[t.priority]}</span>
              <span class="badge s">${statusLabel[t.status]}</span>
            </header>
            <div class="meta">
              <span><strong>Solicitante:</strong> ${escape(t.requester || "—")}</span>
              <span><strong>Setor:</strong> ${escape(t.sector || "—")}</span>
              <span><strong>Aberto em:</strong> ${new Date(t.createdAt).toLocaleString("pt-BR")}</span>
              <span><strong>Progresso:</strong> ${t.progress ?? 0}%</span>
            </div>
            ${t.description ? `<p class="desc">${escape(t.description)}</p>` : ""}
            ${
              t.links?.length
                ? `<div class="links"><strong>Links:</strong><ul>${t.links
                    .map((l) => `<li>${escape(l)}</li>`)
                    .join("")}</ul></div>`
                : ""
            }
          </article>`,
      )
      .join("");
    const filterLabel =
      priorityFilter === "all"
        ? "Todas as prioridades"
        : `Prioridade: ${priorityLabel[priorityFilter]}`;
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Chamados — DevHub</title>
      <style>
        *{box-sizing:border-box}
        body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#111;padding:24px;max-width:900px;margin:0 auto}
        h1{margin:0 0 4px;font-size:22px}
        .sub{color:#555;font-size:13px;margin-bottom:20px}
        .ticket{border:1px solid #ddd;border-radius:8px;padding:14px;margin-bottom:12px;page-break-inside:avoid}
        .ticket header{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:8px}
        .ticket h2{font-size:15px;margin:0;flex:1;min-width:200px}
        .badge{font-size:11px;padding:2px 8px;border-radius:999px;background:#eee}
        .p-baixa{background:#dcfce7;color:#166534}
        .p-media{background:#fef3c7;color:#92400e}
        .p-alta{background:#fee2e2;color:#991b1b}
        .s{background:#e0e7ff;color:#3730a3}
        .meta{display:grid;grid-template-columns:1fr 1fr;gap:4px 16px;font-size:12px;color:#444;margin-bottom:8px}
        .desc{font-size:13px;white-space:pre-wrap;background:#f8f8f8;padding:8px;border-radius:6px;margin:8px 0}
        .links{font-size:12px}
        .links ul{margin:4px 0 0 18px;padding:0}
        @media print{body{padding:0}}
      </style></head><body>
        <h1>Lista de Chamados</h1>
        <div class="sub">${filterLabel} • ${filtered.length} chamado(s) • ${new Date().toLocaleString("pt-BR")}</div>
        ${rows || '<p style="color:#888">Nenhum chamado.</p>'}
        <script>window.onload=()=>setTimeout(()=>window.print(),300)</script>
      </body></html>`;
    const w = window.open("", "_blank");
    if (!w) return toast.error("Permita pop-ups para imprimir");
    w.document.write(html);
    w.document.close();
  };

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
            <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-56 pl-8"
            />
          </div>
          <Select
            value={priorityFilter}
            onValueChange={(v: PriorityFilter) => setPriorityFilter(v)}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Prioridade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas prioridades</SelectItem>
              {(Object.keys(priorityLabel) as Priority[]).map((p) => (
                <SelectItem key={p} value={p}>
                  {priorityLabel[p]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={printList}>
            <Printer className="h-4 w-4" /> Imprimir
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={openNew}>
                <Plus className="h-4 w-4" /> Novo
              </Button>
            </DialogTrigger>
            <DialogContent
              className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"
              onKeyDown={handleDialogKey}
            >
              <DialogHeader>
                <DialogTitle>{editing ? "Editar chamado" : "Novo chamado"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="ticket-title">Título *</Label>
                    <Input
                      id="ticket-title"
                      placeholder="Resumo do problema"
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      aria-invalid={!!titleError}
                      className={cn(titleError && "border-destructive")}
                    />
                    {titleError && (
                      <p className="text-[11px] font-semibold text-destructive" role="alert">
                        {titleError}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ticket-requester">Solicitante</Label>
                    <Input
                      id="ticket-requester"
                      placeholder="Seu nome"
                      value={form.requester}
                      onChange={(e) => setForm({ ...form, requester: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ticket-description">Descrição detalhada *</Label>
                  <Textarea
                    id="ticket-description"
                    ref={descriptionRef}
                    placeholder="O que está acontecendo? Passos para reproduzir, comportamento esperado, mensagens de erro..."
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    aria-invalid={!!descError}
                    className={cn(
                      "min-h-32 resize-none overflow-hidden",
                      descError && "border-destructive",
                    )}
                  />
                  {descError ? (
                    <p className="text-[11px] font-semibold text-destructive" role="alert">
                      {descError}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Quanto mais detalhes, mais rápido o setor consegue resolver.
                    </p>
                  )}
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
              <DialogFooter className="flex-col items-stretch gap-2 sm:flex-row sm:items-center">
                <span className="hidden text-[11px] text-muted-foreground sm:mr-auto sm:inline">
                  Dica: <kbd className="rounded border border-border bg-muted/60 px-1 font-mono text-[10px]">Ctrl</kbd>{" "}
                  +{" "}
                  <kbd className="rounded border border-border bg-muted/60 px-1 font-mono text-[10px]">Enter</kbd>{" "}
                  para salvar
                </span>
                <Button variant="ghost" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={save}>Salvar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <SectionShell
        id="lista-chamados"
        title="Lista de chamados"
        description={`${filtered.length} chamado(s) ${
          priorityFilter !== "all" ? `· prioridade ${priorityLabel[priorityFilter]}` : ""
        }`}
        icon={<TicketIcon className="h-4 w-4" />}
        iconTone="info"
        state={tickets.length === 0 ? "empty" : filtered.length === 0 ? "empty" : "filled"}
        emptyMessage={
          tickets.length === 0
            ? "Você ainda não criou nenhum chamado. Use o botão Novo no topo."
            : "Nenhum chamado bate com os filtros atuais."
        }
      >
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((t) => {
            const imgs = (t.attachments ?? []).filter((a) => a.type.startsWith("image/"));
            return (
              <Card
                key={t.id}
                onClick={() => setView(t)}
                className="group flex cursor-pointer flex-col overflow-hidden transition hover:border-primary/50 hover:shadow-elevated"
              >
                {imgs[0] && (
                  <div className="relative block aspect-video overflow-hidden bg-muted">
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
                  </div>
                )}
                <CardContent className="flex flex-1 flex-col gap-3 p-4">
                  <div className="space-y-1">
                    <h3 className="font-medium leading-snug">{t.title}</h3>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {t.requester || "—"}
                      </span>
                      <span>•</span>
                      <span className="inline-flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        {t.sector ?? "—"}
                      </span>
                      <span>•</span>
                      <span>{new Date(t.createdAt).toLocaleDateString("pt-BR")}</span>
                    </div>
                  </div>

                  {t.description && (
                    <p className="line-clamp-3 text-sm text-muted-foreground">
                      {t.description}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-1.5">
                    <StatusBadge tone={priorityTone[t.priority]} size="sm">
                      {priorityLabel[t.priority]}
                    </StatusBadge>
                    <StatusBadge tone={statusTone[t.status]} size="sm">
                      {statusLabel[t.status]}
                    </StatusBadge>
                    {(t.links?.length ?? 0) > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-md border border-border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        <LinkIcon className="h-3 w-3" />
                        {t.links!.length}
                      </span>
                    )}
                    {(t.attachments?.length ?? 0) > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-md border border-border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        <Paperclip className="h-3 w-3" />
                        {t.attachments!.length}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Progresso</span>
                      <span className="tabular-nums">{t.progress ?? 0}%</span>
                    </div>
                    <Progress value={t.progress ?? 0} />
                  </div>

                  <div
                    className="mt-auto flex justify-end gap-1 pt-1"
                    onClick={(e) => e.stopPropagation()}
                  >
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
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => openEdit(t)}
                      title="Editar"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => remove(t.id)}
                      title="Excluir"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </SectionShell>

      <Dialog open={!!view} onOpenChange={(o) => !o && setView(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          {view && (
            <>
              <DialogHeader>
                <DialogTitle>{view.title}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 rounded-md border bg-muted/30 p-3 text-sm sm:grid-cols-4">
                  <div>
                    <div className="text-xs text-muted-foreground">Solicitante</div>
                    <div className="flex items-center gap-1 font-medium">
                      <User className="h-3.5 w-3.5" />
                      {view.requester || "—"}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Setor</div>
                    <div className="flex items-center gap-1 font-medium">
                      <Building2 className="h-3.5 w-3.5" />
                      {view.sector}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Urgência</div>
                    <StatusBadge tone={priorityTone[view.priority]} size="md">
                      {priorityLabel[view.priority]}
                    </StatusBadge>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Status</div>
                    <StatusBadge tone={statusTone[view.status]} size="md">
                      {statusLabel[view.status]}
                    </StatusBadge>
                  </div>
                  <div className="col-span-2 text-xs text-muted-foreground sm:col-span-4">
                    Aberto em {new Date(view.createdAt).toLocaleString("pt-BR")}
                  </div>
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
