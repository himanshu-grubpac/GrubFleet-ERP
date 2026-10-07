import type { LeaseContractStatus } from '../constants/lease-contract-status';
import { RENEWABLE_CONTRACT_STATUSES } from '../constants/lease-contract-status';

export const RENEWAL_TERM_THRESHOLD_MONTHS = 12;

export type RenewOutcomeKind = 'renewal' | 'extension';

export function classifyRenewOutcomeKind(termMonths: number): RenewOutcomeKind {
  return termMonths >= RENEWAL_TERM_THRESHOLD_MONTHS ? 'renewal' : 'extension';
}

export function renewOutcomePublicLabel(kind: RenewOutcomeKind): string {
  return kind === 'renewal' ? 'Renewal' : 'Extension';
}

export function renewEventTypeForKind(kind: RenewOutcomeKind): string {
  return kind === 'renewal' ? 'contract.renewed' : 'contract.extended';
}

export function assertContractRenewEligible(status: LeaseContractStatus): void {
  if (!RENEWABLE_CONTRACT_STATUSES.includes(status)) {
    throw new Error(
      'Only active contracts are eligible for renewal or extension',
    );
  }
}

export function isContractRenewEligible(status: LeaseContractStatus): boolean {
  return RENEWABLE_CONTRACT_STATUSES.includes(status);
}

export type ContractEventLike = {
  eventType: string;
  createdAt: Date;
};

/** Events are newest-first. */
export function findLatestRenewOutcomeEvent(
  events: ContractEventLike[],
): { kind: RenewOutcomeKind; occurredAt: Date } | null {
  for (const e of events) {
    if (e.eventType === 'contract.renewed') {
      return { kind: 'renewal', occurredAt: e.createdAt };
    }
    if (e.eventType === 'contract.extended') {
      return { kind: 'extension', occurredAt: e.createdAt };
    }
  }
  return null;
}
