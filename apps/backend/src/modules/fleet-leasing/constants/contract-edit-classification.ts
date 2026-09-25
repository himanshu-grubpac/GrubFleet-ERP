/** Stub until Administration Flow 03/26 catalog API exists. */
export const CONTRACT_EDIT_CLASSIFICATIONS = ['clerical', 'material'] as const;

export type ContractEditClassification =
  (typeof CONTRACT_EDIT_CLASSIFICATIONS)[number];

export function normalizeEditClassification(
  value: string | undefined,
): ContractEditClassification {
  if (value === 'material') return 'material';
  return 'clerical';
}
