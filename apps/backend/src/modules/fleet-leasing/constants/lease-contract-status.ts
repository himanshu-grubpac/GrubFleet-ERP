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
} as const;

export type ListStatusFilterKey = keyof typeof LIST_STATUS_FILTER;

export const TERMINAL_STATUSES: LeaseContractStatus[] = ['closed', 'concluded'];

/** Detail edit (PATCH) and availableActions.editContract — all non-terminal lifecycle states except pending termination. */
export const EDITABLE_CONTRACT_STATUSES: LeaseContractStatus[] = [
  'draft',
  'pending_approval',
  'approved',
  'active',
  'awaiting_assets',
  'deactivated',
  'billing_paused',
];
