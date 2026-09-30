"use client";

import { useCallback, useState } from "react";

import { useDebouncedValue } from "./use-debounced-value";

/**
 * Controlled search input (immediate) + debounced term for API/query keys.
 * Keeps the input stable while list queries refetch on debouncedSearch only.
 */
export function useDashboardListSearch(debounceMs = 300) {
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebouncedValue(searchInput, debounceMs);

  const clearSearch = useCallback(() => setSearchInput(""), []);

  return {
    searchInput,
    setSearchInput,
    debouncedSearch,
    clearSearch,
  };
}
