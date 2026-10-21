'use client';

import { useEffect } from 'react';

const RELOAD_SESSION_KEY = 'grubfleet-portal-chunk-reload';

function isChunkLoadFailure(message: string): boolean {
  return (
    message.includes('ChunkLoadError') ||
    message.includes('Loading chunk') ||
    message.includes('Failed to load chunk')
  );
}

/**
 * After a portal deploy, cached HTML may reference removed JS chunks.
 * Reload once so the browser fetches fresh HTML (no UI chrome — recovery only).
 */
export function ChunkLoadRecovery() {
  useEffect(() => {
    const tryReloadOnce = (message: string) => {
      if (!isChunkLoadFailure(message)) return;
      if (sessionStorage.getItem(RELOAD_SESSION_KEY) === '1') return;
      sessionStorage.setItem(RELOAD_SESSION_KEY, '1');
      window.location.reload();
    };

    const onError = (event: ErrorEvent) => {
      tryReloadOnce(event.message ?? String(event.error ?? ''));
    };

    const onRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const message =
        reason instanceof Error
          ? reason.message
          : typeof reason === 'string'
            ? reason
            : '';
      tryReloadOnce(message);
    };

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);

  return null;
}
