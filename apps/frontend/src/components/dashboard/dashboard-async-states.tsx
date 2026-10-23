"use client";

import { LoadingState, ErrorState } from "@/components/states/async-states";
import { getApiErrorMessage } from "@/lib/toast/show-toast";

/** List pages inside DashboardLayout — table skeleton (Administration gold standard). */
export function DashboardListLoadingShell({
  label = "Loading…",
}: {
  label?: string;
}) {
  return (
    <LoadingState
      label={label}
      variant="skeleton"
      skeleton="table"
    />
  );
}

/** Detail / edit initial fetch — page-header skeleton or simple block. */
export function DashboardPageLoadingShell({
  label = "Loading…",
  preset = "page-header",
}: {
  label?: string;
  preset?: "page-header" | "block";
}) {
  return (
    <LoadingState
      label={label}
      variant="skeleton"
      skeleton={preset}
    />
  );
}

/** Detail view query failure — shared retry card. */
export function DashboardDetailErrorShell({
  title = "Failed to load",
  message,
  error,
  fallbackMessage = "Something went wrong. Please try again.",
  onRetry,
}: {
  title?: string;
  message?: string;
  error?: unknown;
  fallbackMessage?: string;
  onRetry?: () => void;
}) {
  const resolvedMessage =
    message ??
    (error != null
      ? getApiErrorMessage(error, fallbackMessage)
      : fallbackMessage);

  return (
    <ErrorState
      title={title}
      message={resolvedMessage}
      onRetry={onRetry}
    />
  );
}
