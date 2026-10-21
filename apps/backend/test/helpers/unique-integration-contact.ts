/** Deterministic unique E.164-style phone for integration tests (per-org uniqueness). */
export function uniqueIntegrationPhone(seed: number | string): string {
  const compact = String(seed).replace(/[^a-zA-Z0-9]/g, '');
  let hash = 0;
  for (let i = 0; i < compact.length; i += 1) {
    hash = (Math.imul(31, hash) + compact.charCodeAt(i)) >>> 0;
  }
  const digits = String(hash).padStart(10, '0').slice(-10);
  return `+91${digits}`;
}
