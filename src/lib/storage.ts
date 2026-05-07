import { useEffect, useState, useCallback } from "react";

export function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) setValue(JSON.parse(raw));
    } catch {}
    setLoaded(true);
  }, [key]);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  }, [key, value, loaded]);

  const update = useCallback((v: T | ((prev: T) => T)) => setValue(v), []);
  return [value, update] as const;
}

export type TicketStatus = "aberto" | "andamento" | "concluido";
export type Priority = "baixa" | "media" | "alta";

export interface Ticket {
  id: string;
  title: string;
  status: TicketStatus;
  priority: Priority;
  createdAt: string;
  completedAt?: string;
}

export type ProjectColumn = "todo" | "doing" | "done";

export interface SubTask {
  id: string;
  text: string;
  done: boolean;
}

export interface ProjectTask {
  id: string;
  title: string;
  description: string;
  column: ProjectColumn;
  checklist: SubTask[];
  createdAt: string;
  completedAt?: string;
}

export interface Note {
  id: string;
  date: string; // YYYY-MM-DD
  text: string;
  createdAt: string;
}

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
