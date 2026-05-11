import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useState } from "react";

/**
 * Agenda route shell — defer client-only para evitar SSR de react-big-calendar
 * (que usa CJS com babel interop e quebra em Vite SSR — testado: tanto
 * default-import quanto noExternal falham).
 *
 * Padrão: mounted guard + lazy import. Servidor nunca toca o componente.
 */
const AgendaContent = lazy(() => import("@/components/AgendaContent"));

export const Route = createFileRoute("/agenda")({
  head: () => ({ meta: [{ title: "Agenda — DevHub" }] }),
  component: AgendaRoute,
});

function AgendaSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="h-7 w-32 animate-pulse rounded-md bg-muted" />
        <div className="h-4 w-96 max-w-full animate-pulse rounded-md bg-muted/70" />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px,1fr]">
        <div className="h-[260px] animate-pulse rounded-2xl bg-muted/40" />
        <div className="h-[660px] animate-pulse rounded-2xl bg-muted/40" />
      </div>
    </div>
  );
}

function AgendaRoute() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return <AgendaSkeleton />;

  return (
    <Suspense fallback={<AgendaSkeleton />}>
      <AgendaContent />
    </Suspense>
  );
}
