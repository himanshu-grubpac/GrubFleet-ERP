/** Mirrors backend RENEWAL_TERM_THRESHOLD_MONTHS (LEASE-17). */
export const RENEWAL_TERM_THRESHOLD_MONTHS = 12;

export type RenewOutcomeKind = "renewal" | "extension";

export function classifyRenewOutcomeKind(
  termMonths: number,
): RenewOutcomeKind {
  return termMonths >= RENEWAL_TERM_THRESHOLD_MONTHS ? "renewal" : "extension";
}
