/** Workshop Flow 20 stub — replace with catalog FK when Workshop module ships. */
export const AMC_TIER_STUB_VALUES = ['Gold', 'Silver', 'Bronze'] as const;

export type AmcTierStub = (typeof AMC_TIER_STUB_VALUES)[number];

export function assertAmcTierOptional(tier: string | null | undefined): void {
  if (tier == null || tier === '') return;
  const allowed = AMC_TIER_STUB_VALUES as readonly string[];
  if (!allowed.includes(tier)) {
    throw new Error(
      `AMC tier must be one of: ${allowed.join(', ')} (Workshop catalog stub)`,
    );
  }
}
