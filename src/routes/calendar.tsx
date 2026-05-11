import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useLocalStorage, uid, type Note } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Bell, CalendarIcon, NotebookText, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  MiniCalendar,
  SectionShell,
  type MarkerMap,
} from "@/components/design-system";

export const Route = createFileRoute("/calendar")({
  head: () => ({ meta: [{ title: "Calendário — DevHub" }] }),
  component: CalendarPage,
});

const fmt = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;

function fromIsoDate(iso: string): Date {
  return new Date(iso + "T00:00:00");
}

function CalendarPage() {
  const [notes, setNotes] = useLocalStorage<Note[]>("notes", []);
  const today = new Date();
  const [cursor, setCursor] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const [selected, setSelected] = useState(fmt(today));
  const [text, setText] = useState("");

  // Markers para o MiniCalendar: cada dia com nota recebe um dot info.
  const markers: MarkerMap = useMemo(() => {
    const map: MarkerMap = {};
    for (const n of notes) {
      if (!map[n.date]) map[n.date] = [];
      map[n.date]!.push({ tone: "info", label: n.text.slice(0, 60) });
    }
    return map;
  }, [notes]);

  const selectedNotes = notes.filter((n) => n.date === selected);
  const selectedDate = fromIsoDate(selected);
  const selectedLabel = selectedDate.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });

  const addNote = () => {
    if (!text.trim()) return;
    setNotes((prev) => [
      {
        id: uid(),
        date: selected,
        text: text.trim(),
        createdAt: new Date().toISOString(),
      },
      ...prev,
    ]);
    setText("");
    toast.success("Anotação adicionada");
  };

  const remove = (id: string) =>
    setNotes((prev) => prev.filter((n) => n.id !== id));

  const notify = () => {
    if (!("Notification" in window))
      return toast.error("Notificações não suportadas");
    Notification.requestPermission().then((p) => {
      if (p === "granted") {
        new Notification("Lembrete DevHub", {
          body: `${selectedNotes.length} anotação(ões) em ${selectedLabel}`,
        });
      }
    });
  };

  const handleTextareaKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      addNote();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Calendário</h1>
        <p className="text-sm text-muted-foreground">
          Anote ideias e lembretes. Dias com anotações aparecem marcados.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <SectionShell
          id="calendar-grid"
          title="Calendário do mês"
          icon={<CalendarIcon className="h-4 w-4" />}
          iconTone="info"
          variant="bare"
        >
          <MiniCalendar
            month={cursor}
            selected={selectedDate}
            markers={markers}
            onSelect={(d) => setSelected(fmt(d))}
            onChangeMonth={(d) => setCursor(d)}
            weekStartsOn={0}
          />
        </SectionShell>

        <SectionShell
          id="day-notes"
          title={selectedLabel.replace(/^./, (c) => c.toUpperCase())}
          description={`${selectedNotes.length} ${
            selectedNotes.length === 1 ? "anotação" : "anotações"
          }`}
          icon={<NotebookText className="h-4 w-4" />}
          iconTone="info"
          actions={
            selectedNotes.length > 0 ? (
              <Button
                size="icon"
                variant="ghost"
                onClick={notify}
                aria-label="Notificar"
                title="Notificar"
              >
                <Bell className="h-4 w-4" />
              </Button>
            ) : undefined
          }
        >
          <div className="space-y-3">
            <div className="space-y-2">
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleTextareaKey}
                placeholder="Nova anotação... (Ctrl+Enter envia)"
                rows={3}
                aria-label="Nova anotação"
              />
              <Button onClick={addNote} className="w-full" disabled={!text.trim()}>
                Adicionar
              </Button>
            </div>

            <div className="space-y-2 border-t border-border pt-3">
              {selectedNotes.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
                  Sem anotações neste dia.
                </p>
              ) : (
                selectedNotes.map((n) => (
                  <div
                    key={n.id}
                    className="flex gap-2 rounded-md border border-border bg-card p-3 text-sm shadow-card"
                  >
                    <p className="flex-1 whitespace-pre-wrap text-foreground">{n.text}</p>
                    <button
                      type="button"
                      onClick={() => remove(n.id)}
                      aria-label="Remover anotação"
                      className="shrink-0 text-muted-foreground transition-colors hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </SectionShell>
      </div>
    </div>
  );
}
