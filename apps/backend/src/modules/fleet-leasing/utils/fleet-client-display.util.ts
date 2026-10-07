/** Prefer Organisation client register name when fleet client is linked (Decision E). */
export function resolveFleetClientCompanyDisplayName(
  fleetCompanyName: string | null | undefined,
  organisationClientName: string | null | undefined,
): string | null {
  const fromOrg = organisationClientName?.trim();
  if (fromOrg) return fromOrg;
  const fromFleet = fleetCompanyName?.trim();
  return fromFleet || null;
}
