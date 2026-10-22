/** SSE heartbeat interval — keeps proxies and load balancers from idle-timeout drops. */
export const ORG_REALTIME_SSE_HEARTBEAT_MS = 30_000;

/** Default cap on concurrent SSE connections per organization (override via env). */
export const ORG_REALTIME_SSE_DEFAULT_MAX_CONNECTIONS_PER_ORG = 50;
