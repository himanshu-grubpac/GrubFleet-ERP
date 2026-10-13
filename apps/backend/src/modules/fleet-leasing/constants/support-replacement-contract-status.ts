import type { LeaseContractStatus } from './lease-contract-status';

/** Contracts where an on-lease vehicle may be replaced (Support v1). */
export const SUPPORT_REPLACEMENT_CONTRACT_STATUSES: LeaseContractStatus[] = [
  'approved',
  'active',
  'awaiting_assets',
  'billing_paused',
];
