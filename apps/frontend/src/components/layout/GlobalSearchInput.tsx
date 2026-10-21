"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/providers/auth-provider";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import {
  searchPortalApi,
  type PortalSearchHit,
} from "@/lib/api/portal-search";
import { portalSearchHitHref } from "@/lib/navigation/portal-search-href";
import { dashboardListQueryOptions } from "@/lib/query/dashboard-list-query-options";
import { cn } from "@/lib/utils";

type GlobalSearchInputProps = {
  className?: string;
  inputClassName?: string;
};

function formatLinkLine(link: PortalSearchHit["links"][number]): string {
  return `${link.label}: ${link.display}`;
}

export default function GlobalSearchInput({
  className,
  inputClassName,
}: GlobalSearchInputProps) {
  const router = useRouter();
  const listboxId = useId();
  const rootRef = useRef<HTMLDivElement>(null);

  const {
    token,
    organizationId,
    isLoading: isAuthLoading,
    isAuthenticated,
  } = useAuth();

  const [query, setQuery] = useState("");
  const [panelOpen, setPanelOpen] = useState(false);
  const debouncedQuery = useDebouncedValue(query.trim(), 300);

  const searchEnabled =
    isAuthenticated &&
    !isAuthLoading &&
    !!token &&
    !!organizationId &&
    debouncedQuery.length >= 1;

  const searchResult = useQuery({
    queryKey: ["portal-search", organizationId, debouncedQuery],
    queryFn: () =>
      searchPortalApi(
        token!,
        { organizationId: organizationId!, q: debouncedQuery },
        organizationId!,
      ),
    enabled: searchEnabled,
    ...dashboardListQueryOptions,
    retry: false,
  });

  const showPanel =
    panelOpen && query.trim().length >= 1 && isAuthenticated;

  const closePanel = useCallback(() => {
    setPanelOpen(false);
  }, []);

  useEffect(() => {
    if (!showPanel) return;

    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      const root = rootRef.current;
      if (!root?.contains(event.target as Node)) {
        closePanel();
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, [closePanel, showPanel]);

  const navigateToHit = (hit: PortalSearchHit) => {
    closePanel();
    setQuery("");
    router.push(portalSearchHitHref(hit));
  };

  const isLoading = searchEnabled && searchResult.isFetching;
  const errorMessage =
    searchResult.isError && searchEnabled
      ? searchResult.error instanceof Error
        ? searchResult.error.message
        : "Search failed. Try again."
      : null;

  const items = searchResult.data?.items ?? [];
  const capApplied = searchResult.data?.meta.capApplied ?? false;

  return (
    <div ref={rootRef} className={cn("relative min-w-0", className)}>
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
        aria-hidden="true"
      />

      <input
        type="search"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setPanelOpen(true);
        }}
        onFocus={() => setPanelOpen(true)}
        placeholder="Search across Fleet Pulse..."
        aria-label="Global search"
        aria-expanded={showPanel}
        aria-controls={showPanel ? listboxId : undefined}
        aria-autocomplete="list"
        role="combobox"
        className={cn(
          "h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-[#FE5720] focus:bg-white focus:ring-2 focus:ring-[#FE5720]/10",
          inputClassName,
        )}
      />

      {showPanel ? (
        <div
          id={listboxId}
          role="listbox"
          aria-label="Search results"
          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-[min(24rem,70vh)] overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
        >
          {isLoading && items.length === 0 ? (
            <div className="flex items-center gap-2 px-4 py-3 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Searching…
            </div>
          ) : null}

          {errorMessage ? (
            <p className="px-4 py-3 text-sm text-red-600" role="alert">
              {errorMessage}
            </p>
          ) : null}

          {!isLoading && !errorMessage && searchEnabled && items.length === 0 ? (
            <p className="px-4 py-3 text-sm text-slate-500">
              No results for &ldquo;{debouncedQuery}&rdquo;.
            </p>
          ) : null}

          {items.map((hit) => {
            const sourceLabel = `${hit.moduleLabel} · ${hit.entityTypeLabel}`;
            return (
              <button
                key={hit.id}
                type="button"
                role="option"
                aria-selected={false}
                className="flex w-full flex-col gap-0.5 border-b border-slate-50 px-4 py-2.5 text-left last:border-b-0 hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#FE5720]"
                onClick={() => navigateToHit(hit)}
              >
                <span className="text-xs font-medium text-slate-500">
                  {sourceLabel}
                </span>
                <span className="text-sm font-semibold text-slate-900">
                  {hit.title}
                </span>
                {hit.subtitle ? (
                  <span className="text-xs text-slate-600">{hit.subtitle}</span>
                ) : null}
                {(hit.links ?? []).length > 0 ? (
                  <span className="mt-0.5 text-xs text-slate-500">
                    {(hit.links ?? []).map(formatLinkLine).join(" · ")}
                  </span>
                ) : null}
              </button>
            );
          })}

          {capApplied && items.length > 0 ? (
            <p className="border-t border-slate-100 px-4 py-2 text-xs text-slate-500">
              Showing capped results — refine your search for more matches.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
