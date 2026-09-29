import { Skeleton } from "@/components/states/skeleton";

const NAV_PLACEHOLDER_COUNT = 8;

/** Mirrors AppShell: sidebar w-64, header h-14, main content padding. */
export function DashboardShellSkeleton() {
  return (
    <div
      className="flex h-screen overflow-hidden bg-slate-50 text-slate-900"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only">Loading application</span>

      <aside className="hidden h-full w-64 shrink-0 border-r border-slate-200 bg-white md:flex md:flex-col">
        <div className="border-b border-slate-200 px-4 py-5 space-y-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-6 w-32" />
        </div>
        <nav className="flex-1 space-y-2 overflow-y-auto p-3" aria-hidden>
          {Array.from({ length: NAV_PLACEHOLDER_COUNT }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full rounded-lg" />
          ))}
        </nav>
        <div
          className="shrink-0 border-t border-slate-200 bg-slate-50/90 px-3 pb-3.5 pt-2.5"
          aria-hidden
        >
          <div className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-2.5 py-2 shadow-sm">
            <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
            <Skeleton className="h-3 min-w-0 flex-1" />
            <Skeleton className="h-4 w-4 shrink-0 rounded-sm" />
          </div>
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4">
          <Skeleton className="h-5 w-28 md:hidden" />
          <div className="hidden flex-1 md:block" aria-hidden />
          <Skeleton className="h-8 w-24 rounded-md md:hidden" />
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6">
          <div className="space-y-6">
            <div className="space-y-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-72 max-w-full" />
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-full max-w-md" />
              <Skeleton className="h-20 w-full" />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

/** Neutral full-viewport placeholder before route redirect (e.g. `/`). */
export function AuthRedirectSkeleton() {
  return (
    <div
      className="flex min-h-screen flex-col bg-slate-50 p-6"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only">Loading</span>
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center space-y-4">
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="mt-4 h-32 w-full rounded-xl" />
      </div>
    </div>
  );
}
