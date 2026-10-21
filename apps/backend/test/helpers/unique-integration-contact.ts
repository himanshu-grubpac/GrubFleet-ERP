/** Deterministic unique E.164-style phone for integration tests (per-org uniqueness). */
export function uniqueIntegrationPhone(seed: number | string): string {
  const digits = String(seed).replace(/\D/g, '').padStart(10, '0').slice(-10);
  return `+91${digits}`;
}
