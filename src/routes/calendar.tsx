import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useLocalStorage, uid, type Note } from "@/lib/storage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ChevronLeft, ChevronRight, Trash2, Bell } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/calendar")({
  head: () => ({ meta: [{ title: "Calendário — DevHub" }] }),
  component: CalendarPage,
});

const dayNames = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];
const monthNames = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;

function CalendarPage() {
  const [notes, setNotes] = useLocalStorage<Note[]>("notes", []);
  const today = new Date();
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected, setSelected] = useState(fmt(today));
  const [text, setText] = useState("");

  const days = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const start = new Date(first); start.setDate(1 - first.getDay());
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start); d.setDate(start.getDate() + i); return d;
    });
  }, [cursor]);

  const noteDays = useMemo(() => new Set(notes.map((n) => n.date)), [notes]);
  const selectedNotes = notes.filter((n) => n.date === selected);

  const addNote = () => {
    if (!text.trim()) return;
    setNotes((prev) => [{ id: uid(), date: selected, text, createdAt: new Date().toISOString() }, ...prev]);
    setText("");
    toast.success("Anotação adicionada");
  };
  const remove = (id: string) => setNotes((prev) => prev.filter((n) => n.id !== id));

  const notify = () => {
    if (!("Notification" in window)) return toast.error("Notificações não suportadas");
    Notification.requestPermission().then((p) => {
      if (p === "granted") {
        new Notification("Lembrete DevHub", { body: `${selectedNotes.length} anotação(ões) em ${selected}` });
      }
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Calendário</h1>
        <p className="text-sm text-muted-foreground">Anote ideias e lembretes.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">{monthNames[cursor.getMonth()]} {cursor.getFullYear()}</CardTitle>
            <div className="flex gap-1">
              <Button size="icon" variant="ghost" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth()-1, 1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth()+1, 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-1 mb-2">
              {dayNames.map((d) => <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {days.map((d, i) => {
                const key = fmt(d);
                const inMonth = d.getMonth() === cursor.getMonth();
                const isToday = key === fmt(today);
                const isSelected = key === selected;
                const has = noteDays.has(key);
                return (
                  <button
                    key={i}
                    onClick={() => setSelected(key)}
                    className={`aspect-square rounded-md text-sm relative transition-colors
                      ${inMonth ? "text-foreground" : "text-muted-foreground/40"}
                      ${isSelected ? "bg-primary text-primary-foreground" : "hover:bg-muted"}
                      ${isToday && !isSelected ? "ring-1 ring-primary" : ""}`}
                  >
                    {d.getDate()}
                    {has && (
                      <span className={`absolute bottom-1 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full ${isSelected ? "bg-primary-foreground" : "bg-primary"}`} />
                    )}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              <span>{new Date(selected + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "long" })}</span>
              {selectedNotes.length > 0 && (
                <Button size="icon" variant="ghost" onClick={notify}><Bell className="h-4 w-4" /></Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Nova anotação..." rows={3} />
            <Button onClick={addNote} className="w-full">Adicionar</Button>
            <div className="space-y-2 pt-2">
              {selectedNotes.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Sem anotações.</p>}
              {selectedNotes.map((n) => (
                <div key={n.id} className="flex gap-2 rounded-md border p-3 text-sm">
                  <p className="flex-1 whitespace-pre-wrap">{n.text}</p>
                  <button onClick={() => remove(n.id)} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
