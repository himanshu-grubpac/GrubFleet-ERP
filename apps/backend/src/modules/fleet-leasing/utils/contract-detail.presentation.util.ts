import type { LeaseContractStatus } from '../constants/lease-contract-status';
import { getContractEditBlockReason } from './contract-edit.util';

export type ContractEventRow = {
  id: string;
  eventType: string;
  message: string;
  actorUserId: string | null;
  createdAt: Date;
};

export type StatusBannerLevel = 'success' | 'info' | 'warning';

export type AvailableActionKey =
  'editContract' | 'deactivate' | 'reactivate' | 'pauseBilling' | 'terminate';

export type AvailableAction = {
  allowed: boolean;
  disabledReason?: string;
};

export type AvailableActionsMap = Record<AvailableActionKey, AvailableAction>;

const LIFECYCLE_EVENT_TYPES = new Set([
  'contract.deactivated',
  'contract.reactivated',
  'contract.billing_paused',
  'contract.termination_requested',
  'contract.termination_approved',
  'contract.activated',
  'contract.confirmed',
  'contract.renewed',
  'contract.extended',
]);

export function findLatestEventByType(
  events: ContractEventRow[],
  eventType: string,
): ContractEventRow | null {
  for (const e of events) {
    if (e.eventType === eventType) return e;
  }
  return null;
}

export function resolveActorLabel(
  actorUserId: string | null,
  labelsByUserId: Map<string, string>,
): string | null {
  if (!actorUserId) return null;
  return labelsByUserId.get(actorUserId) ?? null;
}

export function buildLifecycleLogMessage(
  eventType: string,
  rawMessage: string,
  actorLabel: string | null,
): string {
  switch (eventType) {
    case 'contract.deactivated':
      return actorLabel
        ? `${actorLabel} deactivated this contract — billing continues until all vehicles are returned and registered.`
        : 'Contract deactivated — billing continues until all vehicles are returned and registered.';
    case 'contract.reactivated':
      return actorLabel
        ? `${actorLabel} reactivated this contract.`
        : 'Contract reactivated successfully.';
    case 'contract.billing_paused':
      return actorLabel
        ? `${actorLabel} paused billing for this contract.`
        : 'Billing paused successfully.';
    case 'contract.termination_requested':
      return actorLabel
        ? `${actorLabel} requested contract termination — pending Contract Admin approval.`
        : 'Termination requested — pending Contract Admin approval.';
    case 'contract.termination_approved':
      return actorLabel
        ? `${actorLabel} completed termination — security deposit settled. Contract closed.`
        : 'Termination completed successfully — security deposit settled. Contract closed.';
    case 'contract.renewed':
      return actorLabel
        ? `${actorLabel} renewed this contract.`
        : 'Contract renewed.';
    case 'contract.extended':
      return actorLabel
        ? `${actorLabel} extended this contract.`
        : 'Contract extended.';
    default:
      return rawMessage;
  }
}

export function buildStatusTags(input: {
  rawStatus: LeaseContractStatus;
  billingPaused: boolean;
  onHold: boolean;
}): string[] {
  const { rawStatus, billingPaused, onHold } = input;
  const tags: string[] = [];
  if (rawStatus === 'closed' || rawStatus === 'concluded') {
    tags.push('Closed');
    return tags;
  }
  if (rawStatus === 'pending_termination') {
    tags.push('Deactivated');
    if (billingPaused) tags.push('Billing paused');
    tags.push('Pending termination');
    return tags;
  }
  if (rawStatus === 'billing_paused') {
    tags.push('Deactivated');
    tags.push('Billing paused');
    return tags;
  }
  if (rawStatus === 'deactivated' || onHold) {
    tags.push('Deactivated');
    if (billingPaused) tags.push('Billing paused');
    return tags;
  }
  if (rawStatus === 'active') {
    tags.push('Active');
    return tags;
  }
  if (rawStatus === 'awaiting_assets') {
    tags.push('Awaiting Assets');
    return tags;
  }
  if (rawStatus === 'pending_approval') {
    tags.push('Pending Approval');
    return tags;
  }
  if (rawStatus === 'approved') {
    tags.push('Approved');
    return tags;
  }
  if (rawStatus === 'draft') {
    tags.push('Draft');
  }
  return tags;
}

export function buildDetailSubtitle(input: {
  rawStatus: LeaseContractStatus;
  clientCompanyName: string | null;
  billingPaused: boolean;
  onHold: boolean;
  contractFullyAllocated?: boolean;
  totalCommitted?: number;
  totalAllocated?: number;
  latestRenewOutcomeKind?: 'renewal' | 'extension' | null;
}): string {
  if (
    input.rawStatus === 'active' &&
    input.latestRenewOutcomeKind === 'renewal'
  ) {
    return 'Contract renewed — terms updated and contract remains active.';
  }
  if (
    input.rawStatus === 'active' &&
    input.latestRenewOutcomeKind === 'extension'
  ) {
    return 'Contract extended — terms updated and contract remains active.';
  }
  if (input.rawStatus === 'active' && input.contractFullyAllocated) {
    if (
      input.totalCommitted != null &&
      input.totalCommitted > 0 &&
      input.totalAllocated != null
    ) {
      return `${input.totalAllocated} of ${input.totalCommitted} committed unit(s) allocated.`;
    }
    return 'All committed units allocated.';
  }
  if (
    input.rawStatus === 'active' &&
    input.totalCommitted != null &&
    input.totalAllocated != null &&
    input.totalCommitted > 0 &&
    input.totalAllocated < input.totalCommitted
  ) {
    return `${input.totalAllocated} of ${input.totalCommitted} committed unit(s) allocated.`;
  }
  const client = input.clientCompanyName ?? 'the client';
  const base = `Fleet & Leasing contract with ${client}.`;
  if (input.rawStatus === 'closed' || input.rawStatus === 'concluded') {
    return `${base} Terminated.`;
  }
  if (input.rawStatus === 'pending_termination') {
    return `${base} Termination in progress — complete to close the contract.`;
  }
  if (
    input.rawStatus === 'deactivated' ||
    input.rawStatus === 'billing_paused' ||
    input.onHold
  ) {
    if (input.billingPaused || input.rawStatus === 'billing_paused') {
      return `${base} On hold — billing is paused.`;
    }
    return `${base} On hold — billing continues until all vehicles are returned & registered.`;
  }
  return base;
}

export function buildStatusBanner(input: {
  rawStatus: LeaseContractStatus;
  events: ContractEventRow[];
  labelsByUserId: Map<string, string>;
  contractFullyAllocated?: boolean;
  totalCommitted?: number;
  totalAllocated?: number;
}): {
  level: StatusBannerLevel;
  text: string;
  occurredAt: string | null;
  actorLabel: string | null;
} | null {
  const { rawStatus } = input;
  if (rawStatus === 'active') {
    return null;
  }
  if (rawStatus === 'closed' || rawStatus === 'concluded') {
    return null;
  }
  if (rawStatus === 'pending_termination') {
    return {
      level: 'info',
      text: 'Termination in progress — use Terminate to close this contract and settle the security deposit.',
      occurredAt: null,
      actorLabel: null,
    };
  }
  return null;
}

export function buildAvailableActions(input: {
  rawStatus: LeaseContractStatus;
  canPauseBilling: boolean;
}): AvailableActionsMap {
  const { rawStatus, canPauseBilling } = input;
  const deny = (reason: string): AvailableAction => ({
    allowed: false,
    disabledReason: reason,
  });
  const allow = (): AvailableAction => ({ allowed: true });

  const editBlockReason = getContractEditBlockReason(rawStatus);
  const editContract = editBlockReason ? deny(editBlockReason) : allow();

  const deactivate =
    rawStatus === 'active'
      ? allow()
      : deny('Only active contracts can be deactivated');

  const reactivate =
    rawStatus === 'deactivated' || rawStatus === 'billing_paused'
      ? allow()
      : rawStatus === 'closed' || rawStatus === 'concluded'
        ? deny('Terminated contracts cannot be reactivated')
        : rawStatus === 'pending_termination'
          ? deny('Reactivation is not available while termination is pending')
          : deny('Only deactivated contracts can be reactivated');

  let pauseBilling: AvailableAction;
  if (rawStatus !== 'deactivated') {
    pauseBilling = deny('Pause billing only applies to deactivated contracts');
  } else if (!canPauseBilling) {
    pauseBilling = deny(
      'All vehicles must be returned and registered before pausing billing',
    );
  } else {
    pauseBilling = allow();
  }

  let terminate: AvailableAction;
  if (rawStatus === 'closed' || rawStatus === 'concluded') {
    terminate = deny('Contract is already terminated');
  } else if (
    rawStatus === 'deactivated' ||
    rawStatus === 'billing_paused' ||
    rawStatus === 'pending_termination'
  ) {
    terminate = allow();
  } else {
    terminate = deny('Terminate from deactivated/on-hold state only');
  }

  return {
    editContract,
    deactivate,
    reactivate,
    pauseBilling,
    terminate,
  };
}

export function mapLifecycleLogs(
  events: ContractEventRow[],
  labelsByUserId: Map<string, string>,
): Array<{
  id: string;
  eventType: string;
  message: string;
  occurredAt: string;
  actorUserId: string | null;
  actorLabel: string | null;
}> {
  return events
    .filter((e) => LIFECYCLE_EVENT_TYPES.has(e.eventType))
    .map((e) => {
      const actorLabel = resolveActorLabel(e.actorUserId, labelsByUserId);
      return {
        id: e.id,
        eventType: e.eventType,
        message: buildLifecycleLogMessage(e.eventType, e.message, actorLabel),
        occurredAt: e.createdAt.toISOString(),
        actorUserId: e.actorUserId,
        actorLabel,
      };
    });
}

export function mapAllLogs(
  events: ContractEventRow[],
  labelsByUserId: Map<string, string>,
): Array<{
  id: string;
  eventType: string;
  message: string;
  occurredAt: string;
  actorUserId: string | null;
  actorLabel: string | null;
  createdAt: string;
}> {
  return events.map((e) => {
    const actorLabel = resolveActorLabel(e.actorUserId, labelsByUserId);
    const message = LIFECYCLE_EVENT_TYPES.has(e.eventType)
      ? buildLifecycleLogMessage(e.eventType, e.message, actorLabel)
      : e.message;
    const occurredAt = e.createdAt.toISOString();
    return {
      id: e.id,
      eventType: e.eventType,
      message,
      occurredAt,
      actorUserId: e.actorUserId,
      actorLabel,
      createdAt: occurredAt,
    };
  });
}
