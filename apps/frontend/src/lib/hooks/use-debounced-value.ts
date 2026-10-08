"use client";

import { useEffect, useState } from "react";

/** Debounces a value for server-backed list search (default 300ms). */
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    if (typeof value === "string" && value.length === 0) {
      setDebounced(value);
      return;
    }

    const handle = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(handle);
  }, [value, delayMs]);

  return debounced;
}
