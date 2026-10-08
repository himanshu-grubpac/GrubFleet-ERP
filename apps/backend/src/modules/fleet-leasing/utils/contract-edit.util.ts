import {
  EDITABLE_CONTRACT_STATUSES,
  TERMINAL_STATUSES,
  type LeaseContractStatus,
} from '../constants/lease-contract-status';

export function getContractEditBlockReason(
  status: LeaseContractStatus,
): string | null {
  if (TERMINAL_STATUSES.includes(status)) {
    return 'Cannot update a closed contract';
  }
  if (status === 'deactivated' || status === 'billing_paused') {
    return 'Inactive lease contract cannot be edited until reactivated';
  }
  if (status === 'pending_termination') {
    return 'Contract cannot be edited while termination is pending';
  }
  if (!EDITABLE_CONTRACT_STATUSES.includes(status)) {
    return 'Contract cannot be edited in the current status';
  }
  return null;
}

export function isContractEditable(status: LeaseContractStatus): boolean {
  return getContractEditBlockReason(status) === null;
}
