export type LeaseContractStatus =
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'active'
  | 'awaiting_assets'
  | 'deactivated'
  | 'billing_paused'
  | 'pending_termination'
  | 'closed'
  | 'concluded';

/** Figma list filter chips → DB statuses. */
export const LIST_STATUS_FILTER = {
  all: null,
  active: ['active'] as LeaseContractStatus[],
  awaiting_assets: ['awaiting_assets'] as LeaseContractStatus[],
  pending_approval: ['pending_approval'] as LeaseContractStatus[],
  draft: ['draft'] as LeaseContractStatus[],
  /** Figma "Completed". */
  completed: ['closed', 'concluded'] as LeaseContractStatus[],
  deactivated: ['deactivated'] as LeaseContractStatus[],
  billing_paused: ['billing_paused'] as LeaseContractStatus[],
  pending_termination: ['pending_termination'] as LeaseContractStatus[],
} as const;

/** Flow 02 — allocate vehicles while contract is live or pre-active. */
export const ALLOCATION_ELIGIBLE_CONTRACT_STATUSES: LeaseContractStatus[] = [
  'approved',
  'active',
  'awaiting_assets',
];

export type ListStatusFilterKey = keyof typeof LIST_STATUS_FILTER;

export const TERMINAL_STATUSES: LeaseContractStatus[] = ['closed', 'concluded'];

/** Detail edit (PATCH) and availableActions.editContract — non-terminal, non-deactivated lifecycle states (rule 31). */
export const EDITABLE_CONTRACT_STATUSES: LeaseContractStatus[] = [
  'draft',
  'pending_approval',
  'approved',
  'active',
  'awaiting_assets',
];

/** Renewals & Extensions list — active contracts only (LEASE-16). */
export const RENEWABLE_CONTRACT_STATUSES: LeaseContractStatus[] = ['active'];
