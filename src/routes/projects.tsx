import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useLocalStorage, uid, type ProjectTask, type ProjectColumn, type SubTask } from "@/lib/storage";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/projects")({
  head: () => ({ meta: [{ title: "Projetos — DevHub" }] }),
  component: ProjectsPage,
});

const columns: { id: ProjectColumn; title: string; accent: string }[] = [
  { id: "todo", title: "A fazer", accent: "border-t-blue-500" },
  { id: "doing", title: "Em andamento", accent: "border-t-amber-500" },
  { id: "done", title: "Concluído", accent: "border-t-emerald-500" },
];

function ProjectsPage() {
  const [tasks, setTasks] = useLocalStorage<ProjectTask[]>("projects", []);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ProjectTask | null>(null);
  const [form, setForm] = useState({ title: "", description: "" });
  const [dragId, setDragId] = useState<string | null>(null);

  const openNew = () => {
    setEditing(null);
    setForm({ title: "", description: "" });
    setOpen(true);
  };
  const openEdit = (t: ProjectTask) => {
    setEditing(t);
    setForm({ title: t.title, description: t.description });
    setOpen(true);
  };

  const save = () => {
    if (!form.title.trim()) return toast.error("Informe um título");
    if (editing) {
      setTasks((prev) => prev.map((t) => t.id === editing.id ? { ...t, ...form } : t));
    } else {
      setTasks((prev) => [{
        id: uid(), ...form, column: "todo", checklist: [],
        createdAt: new Date().toISOString(),
      }, ...prev]);
    }
    setOpen(false);
  };

  const moveTo = (id: string, col: ProjectColumn) =>
    setTasks((prev) => prev.map((t) => t.id === id ? {
      ...t, column: col,
      completedAt: col === "done" ? new Date().toISOString() : t.completedAt,
    } : t));

  const remove = (id: string) => setTasks((prev) => prev.filter((t) => t.id !== id));

  const addSub = (id: string, text: string) => {
    if (!text.trim()) return;
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, checklist: [...t.checklist, { id: uid(), text, done: false }] } : t));
  };
  const toggleSub = (tid: string, sid: string) =>
    setTasks((prev) => prev.map((t) => t.id === tid ? { ...t, checklist: t.checklist.map((s) => s.id === sid ? { ...s, done: !s.done } : s) } : t));
  const removeSub = (tid: string, sid: string) =>
    setTasks((prev) => prev.map((t) => t.id === tid ? { ...t, checklist: t.checklist.filter((s) => s.id !== sid) } : t));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Projetos</h1>
          <p className="text-sm text-muted-foreground">Arraste tarefas entre as colunas.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew}><Plus className="h-4 w-4" /> Nova tarefa</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing ? "Editar" : "Nova tarefa"}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input placeholder="Título" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              <Textarea placeholder="Descrição curta" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={save}>Salvar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {columns.map((col) => {
          const items = tasks.filter((t) => t.column === col.id);
          return (
            <div
              key={col.id}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => { if (dragId) { moveTo(dragId, col.id); setDragId(null); } }}
              className={`rounded-lg border-t-4 ${col.accent} bg-muted/30 p-3 min-h-[400px]`}
            >
              <div className="mb-3 flex items-center justify-between px-1">
                <h2 className="text-sm font-semibold">{col.title}</h2>
                <span className="text-xs text-muted-foreground">{items.length}</span>
              </div>
              <div className="space-y-2">
                {items.map((t) => (
                  <TaskCard
                    key={t.id} task={t}
                    onDragStart={() => setDragId(t.id)}
                    onEdit={() => openEdit(t)}
                    onRemove={() => remove(t.id)}
                    onAddSub={(text) => addSub(t.id, text)}
                    onToggleSub={(sid) => toggleSub(t.id, sid)}
                    onRemoveSub={(sid) => removeSub(t.id, sid)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TaskCard({ task, onDragStart, onEdit, onRemove, onAddSub, onToggleSub, onRemoveSub }: {
  task: ProjectTask;
  onDragStart: () => void;
  onEdit: () => void;
  onRemove: () => void;
  onAddSub: (text: string) => void;
  onToggleSub: (sid: string) => void;
  onRemoveSub: (sid: string) => void;
}) {
  const [sub, setSub] = useState("");
  const done = task.checklist.filter((s: SubTask) => s.done).length;

  return (
    <Card draggable onDragStart={onDragStart} className="cursor-grab active:cursor-grabbing">
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start gap-2">
          <GripVertical className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
          <div className="flex-1">
            <div className="font-medium text-sm cursor-pointer hover:underline" onClick={onEdit}>{task.title}</div>
            {task.description && <div className="text-xs text-muted-foreground mt-0.5">{task.description}</div>}
          </div>
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={onRemove}><Trash2 className="h-3 w-3" /></Button>
        </div>
        {task.checklist.length > 0 && (
          <div className="space-y-1 pl-6">
            {task.checklist.map((s) => (
              <div key={s.id} className="flex items-center gap-2 group">
                <Checkbox checked={s.done} onCheckedChange={() => onToggleSub(s.id)} />
                <span className={`text-xs flex-1 ${s.done ? "line-through text-muted-foreground" : ""}`}>{s.text}</span>
                <button onClick={() => onRemoveSub(s.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground">
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
            <div className="text-[10px] text-muted-foreground">{done}/{task.checklist.length} concluídas</div>
          </div>
        )}
        <form
          onSubmit={(e) => { e.preventDefault(); onAddSub(sub); setSub(""); }}
          className="flex gap-1 pl-6"
        >
          <Input value={sub} onChange={(e) => setSub(e.target.value)} placeholder="+ subtarefa" className="h-7 text-xs" />
        </form>
      </CardContent>
    </Card>
  );
}
