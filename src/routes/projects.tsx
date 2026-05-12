import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  useLocalStorage,
  uid,
  type ProjectTask,
  type ProjectColumn,
  type SubTask,
  type TaskAttachment,
} from "@/lib/storage";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useSortable, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Trash2, GripVertical, FolderKanban } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { SectionShell } from "@/components/design-system";

export const Route = createFileRoute("/projects")({
  head: () => ({ meta: [{ title: "Projetos — DevHub" }] }),
  component: ProjectsPage,
});

const columns: { id: ProjectColumn; title: string; accentVar: string }[] = [
  { id: "todo", title: "A fazer", accentVar: "--status-pending" },
  { id: "doing", title: "Em andamento", accentVar: "--status-progress" },
  { id: "done", title: "Concluído", accentVar: "--status-done" },
];

const DRAFT_KEY = "projects-new-draft";

function readDraft(): { title: string; description: string } | null {
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
function writeDraft(d: { title: string; description: string }) {
  try {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(d));
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

function ProjectsPage() {
  const [tasks, setTasks] = useLocalStorage<ProjectTask[]>("projects", []);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ProjectTask | null>(null);
  const [form, setForm] = useState({ title: "", description: "" });
  const [submitted, setSubmitted] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  // Auto-save draft (apenas para "novo")
  useEffect(() => {
    if (!open || editing) return;
    const id = window.setTimeout(() => writeDraft(form), 500);
    return () => window.clearTimeout(id);
  }, [form, open, editing]);

  const openNew = () => {
    setEditing(null);
    const draft = readDraft();
    setForm(draft ?? { title: "", description: "" });
    setSubmitted(false);
    setOpen(true);
  };
  const openEdit = (t: ProjectTask) => {
    setEditing(t);
    setForm({ title: t.title, description: t.description });
    setSubmitted(false);
    setOpen(true);
  };

  const titleError = submitted && !form.title.trim() ? "Título obrigatório." : undefined;
  const isValid = !!form.title.trim();

  const save = () => {
    setSubmitted(true);
    if (!isValid) {
      toast.error("Informe um título");
      return;
    }
    if (editing) {
      setTasks((prev) => prev.map((t) => (t.id === editing.id ? { ...t, ...form } : t)));
      toast.success("Tarefa atualizada");
    } else {
      setTasks((prev) => [
        {
          id: uid(),
          ...form,
          column: "todo",
          checklist: [],
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ]);
      toast.success("Tarefa criada");
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

  const moveTo = (id: string, col: ProjectColumn) =>
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              column: col,
              completedAt: col === "done" ? new Date().toISOString() : t.completedAt,
            }
          : t,
      ),
    );

  const remove = (id: string) => setTasks((prev) => prev.filter((t) => t.id !== id));

  const addSub = (id: string, text: string) => {
    if (!text.trim()) return;
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id
          ? { ...t, checklist: [...t.checklist, { id: uid(), text, done: false }] }
          : t,
      ),
    );
  };
  const toggleSub = (tid: string, sid: string) =>
    setTasks((prev) =>
      prev.map((t) =>
        t.id === tid
          ? {
              ...t,
              checklist: t.checklist.map((s) =>
                s.id === sid ? { ...s, done: !s.done } : s,
              ),
            }
          : t,
      ),
    );
  const removeSub = (tid: string, sid: string) =>
    setTasks((prev) =>
      prev.map((t) =>
        t.id === tid
          ? { ...t, checklist: t.checklist.filter((s) => s.id !== sid) }
          : t,
      ),
    );

  // Drag handlers
  const handleDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));
  const handleDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;
    const activeIdStr = String(active.id);
    const overData = over.data.current as { column?: ProjectColumn } | undefined;
    const targetCol = overData?.column;
    if (!targetCol) return;
    const moving = tasks.find((t) => t.id === activeIdStr);
    if (!moving || moving.column === targetCol) return;
    moveTo(activeIdStr, targetCol);
  };

  const activeTask = activeId ? tasks.find((t) => t.id === activeId) ?? null : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Projetos</h1>
          <p className="text-sm text-muted-foreground">
            Arraste tarefas entre as colunas. Atalho: <kbd className="rounded border border-border bg-muted/60 px-1 font-mono text-[10px]">Ctrl</kbd>{" "}
            +{" "}
            <kbd className="rounded border border-border bg-muted/60 px-1 font-mono text-[10px]">Enter</kbd>{" "}
            salva no dialog.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew}>
              <Plus className="h-4 w-4" /> Nova tarefa
            </Button>
          </DialogTrigger>
          <DialogContent onKeyDown={handleDialogKey}>
            <DialogHeader>
              <DialogTitle>{editing ? "Editar" : "Nova tarefa"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <Input
                  placeholder="Título *"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  aria-invalid={!!titleError}
                  className={cn(titleError && "border-destructive")}
                  autoFocus
                />
                {titleError && (
                  <p className="text-[11px] font-semibold text-destructive" role="alert">
                    {titleError}
                  </p>
                )}
              </div>
              <Textarea
                placeholder="Descrição curta"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
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

      <SectionShell
        id="kanban"
        title="Quadro Kanban"
        description={`${tasks.length} ${tasks.length === 1 ? "tarefa" : "tarefas"} no total`}
        icon={<FolderKanban className="h-4 w-4" />}
        iconTone="info"
        variant="bare"
      >
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="grid gap-4 md:grid-cols-3">
            {columns.map((col) => {
              const items = tasks.filter((t) => t.column === col.id);
              return (
                <KanbanColumn
                  key={col.id}
                  id={col.id}
                  title={col.title}
                  accentVar={col.accentVar}
                  count={items.length}
                >
                  <SortableContext
                    items={items.map((t) => t.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {items.map((t) => (
                      <SortableTaskCard
                        key={t.id}
                        task={t}
                        onEdit={() => openEdit(t)}
                        onRemove={() => remove(t.id)}
                        onAddSub={(text) => addSub(t.id, text)}
                        onToggleSub={(sid) => toggleSub(t.id, sid)}
                        onRemoveSub={(sid) => removeSub(t.id, sid)}
                      />
                    ))}
                  </SortableContext>
                  {items.length === 0 && (
                    <div className="rounded-lg border border-dashed border-border/60 px-3 py-6 text-center text-xs text-muted-foreground">
                      Solte tarefas aqui
                    </div>
                  )}
                </KanbanColumn>
              );
            })}
          </div>

          <DragOverlay>
            {activeTask ? (
              <Card className="rotate-1 cursor-grabbing border-primary/40 shadow-elevated">
                <CardContent className="space-y-1 p-3">
                  <div className="flex items-start gap-2">
                    <GripVertical className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="text-sm font-medium">{activeTask.title}</div>
                  </div>
                </CardContent>
              </Card>
            ) : null}
          </DragOverlay>
        </DndContext>
      </SectionShell>
    </div>
  );
}

function KanbanColumn({
  id,
  title,
  accentVar,
  count,
  children,
}: {
  id: ProjectColumn;
  title: string;
  accentVar: string;
  count: number;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `col-${id}`, data: { column: id } });
  return (
    <div
      ref={setNodeRef}
      role="region"
      aria-label={`${title}: ${count} ${count === 1 ? "tarefa" : "tarefas"}`}
      className={cn(
        "min-h-[400px] rounded-lg border-t-4 bg-muted/30 p-3 transition-colors",
        isOver && "bg-primary/5 ring-2 ring-primary/30",
      )}
      style={{ borderTopColor: `var(${accentVar})` }}
    >
      <div className="mb-3 flex items-center justify-between px-1">
        <h2 className="text-sm font-semibold">{title}</h2>
        <span className="rounded-md border border-border bg-card px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-muted-foreground">
          {count}
        </span>
      </div>
      <div role="list" className="space-y-2">
        {children}
      </div>
    </div>
  );
}

function SortableTaskCard({
  task,
  onEdit,
  onRemove,
  onAddSub,
  onToggleSub,
  onRemoveSub,
}: {
  task: ProjectTask;
  onEdit: () => void;
  onRemove: () => void;
  onAddSub: (text: string) => void;
  onToggleSub: (sid: string) => void;
  onRemoveSub: (sid: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });
  const [sub, setSub] = useState("");
  const done = task.checklist.filter((s: SubTask) => s.done).length;
  const total = task.checklist.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <Card
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn(
        "transition-shadow hover:shadow-card",
        isDragging && "opacity-40",
      )}
    >
      <CardContent className="space-y-2 p-3">
        <div className="flex items-start gap-2">
          <button
            type="button"
            {...attributes}
            {...listeners}
            aria-label="Arrastar tarefa"
            className="mt-0.5 cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing"
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <div className="min-w-0 flex-1">
            <div
              className="cursor-pointer text-sm font-medium hover:underline"
              onClick={onEdit}
            >
              {task.title}
            </div>
            {task.description && (
              <div className="mt-0.5 text-xs text-muted-foreground">
                {task.description}
              </div>
            )}
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            onClick={onRemove}
            aria-label="Excluir tarefa"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>

        {total > 0 && (
          <div className="space-y-1 pl-6">
            <Progress value={pct} className="h-1" />
            <div className="text-[10px] text-muted-foreground">
              {done}/{total} concluídas
            </div>
            {task.checklist.map((s) => (
              <div key={s.id} className="group flex items-center gap-2">
                <Checkbox
                  checked={s.done}
                  onCheckedChange={() => onToggleSub(s.id)}
                  aria-label={s.done ? `Reabrir: ${s.text}` : `Concluir: ${s.text}`}
                />
                <span
                  className={cn(
                    "flex-1 text-xs",
                    s.done && "text-muted-foreground line-through",
                  )}
                >
                  {s.text}
                </span>
                <button
                  type="button"
                  onClick={() => onRemoveSub(s.id)}
                  aria-label={`Remover subtarefa: ${s.text}`}
                  className="text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            onAddSub(sub);
            setSub("");
          }}
          className="flex gap-1 pl-6"
        >
          <Input
            value={sub}
            onChange={(e) => setSub(e.target.value)}
            placeholder="+ subtarefa"
            className="h-7 text-xs"
          />
        </form>
      </CardContent>
    </Card>
  );
}
