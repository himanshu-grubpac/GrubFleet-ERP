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
  if (!EDITABLE_CONTRACT_STATUSES.includes(status)) {
    return 'Contract cannot be edited in the current status';
  }
  return null;
}

export function isContractEditable(status: LeaseContractStatus): boolean {
  return getContractEditBlockReason(status) === null;
}
