"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef } from "react";

import { useGrubpacAuth } from "@/providers/auth-provider";
import { buildOrganizationEventsStreamUrl } from "./build-organization-events-stream-url";
import { invalidateQueriesForOrganizationDomainEvent } from "./event-invalidation-registry";
import {
  isOrganizationDomainEventPayload,
  isOrganizationDomainEventPing,
} from "./organization-domain-event-types";

const MIN_RECONNECT_MS = 1_000;
const MAX_RECONNECT_MS = 30_000;

function isOrganizationRealtimeEnabled(): boolean {
  const flag = process.env.NEXT_PUBLIC_ORG_REALTIME_ENABLED;
  return flag !== "false";
}

function readAccessToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    return localStorage.getItem("access_token");
  } catch {
    return null;
  }
}

/**
 * Subscribes to org-scoped SSE domain events and invalidates TanStack Query caches.
 * WS/SSE is a refresh hint only — mutations still fail closed (e.g. assign 409).
 */
export function useOrganizationRealtimeSync(): void {
  const queryClient = useQueryClient();
  const { isAuthenticated, isLoading, organizationId } = useGrubpacAuth();
  const reconnectAttemptRef = useRef(0);
  const sourceRef = useRef<EventSource | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const closeStream = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (sourceRef.current) {
      sourceRef.current.close();
      sourceRef.current = null;
    }
  }, []);

  const scheduleReconnect = useCallback(
    (connect: () => void) => {
      const attempt = reconnectAttemptRef.current;
      const delay = Math.min(
        MAX_RECONNECT_MS,
        MIN_RECONNECT_MS * 2 ** attempt,
      );
      reconnectAttemptRef.current = attempt + 1;
      reconnectTimerRef.current = setTimeout(connect, delay);
    },
    [],
  );

  useEffect(() => {
    if (
      !isOrganizationRealtimeEnabled() ||
      isLoading ||
      !isAuthenticated ||
      !organizationId
    ) {
      closeStream();
      reconnectAttemptRef.current = 0;
      return;
    }

    let cancelled = false;

    const connect = () => {
      if (cancelled) {
        return;
      }
      const token = readAccessToken();
      if (!token) {
        return;
      }

      closeStream();
      const url = buildOrganizationEventsStreamUrl(organizationId, token);
      const source = new EventSource(url);
      sourceRef.current = source;

      source.onopen = () => {
        reconnectAttemptRef.current = 0;
      };

      source.onmessage = (message) => {
        try {
          const parsed: unknown = JSON.parse(message.data);
          if (isOrganizationDomainEventPing(parsed)) {
            return;
          }
          if (!isOrganizationDomainEventPayload(parsed)) {
            return;
          }
          if (parsed.organizationId !== organizationId) {
            return;
          }
          void invalidateQueriesForOrganizationDomainEvent(
            queryClient,
            parsed,
          );
        } catch {
          // Ignore malformed SSE payloads
        }
      };

      source.onerror = () => {
        source.close();
        if (sourceRef.current === source) {
          sourceRef.current = null;
        }
        if (!cancelled) {
          scheduleReconnect(connect);
        }
      };
    };

    connect();

    const onTokensRefreshed = () => {
      reconnectAttemptRef.current = 0;
      connect();
    };

    window.addEventListener("auth:tokens-refreshed", onTokensRefreshed);

    return () => {
      cancelled = true;
      window.removeEventListener("auth:tokens-refreshed", onTokensRefreshed);
      closeStream();
      reconnectAttemptRef.current = 0;
    };
  }, [
    closeStream,
    isAuthenticated,
    isLoading,
    organizationId,
    queryClient,
    scheduleReconnect,
  ]);
}
