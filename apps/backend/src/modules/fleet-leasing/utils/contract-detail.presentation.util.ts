import {
  RENEWABLE_CONTRACT_STATUSES,
  type LeaseContractStatus,
} from '../constants/lease-contract-status';
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
  | 'editContract'
  | 'deactivate'
  | 'reactivate'
  | 'pauseBilling'
  | 'requestTermination'
  | 'approveTermination'
  | 'renew';

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
}): string {
  const client = input.clientCompanyName ?? 'the client';
  const base = `Fleet & Leasing contract with ${client}.`;
  if (input.rawStatus === 'closed' || input.rawStatus === 'concluded') {
    return `${base} Terminated.`;
  }
  if (input.rawStatus === 'pending_termination') {
    return `${base} Termination pending Contract Admin approval.`;
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
}): {
  level: StatusBannerLevel;
  text: string;
  occurredAt: string | null;
  actorLabel: string | null;
} | null {
  const { rawStatus, events, labelsByUserId } = input;
  if (rawStatus === 'closed' || rawStatus === 'concluded') {
    const term = findLatestEventByType(events, 'contract.termination_approved');
    const actorLabel = term
      ? resolveActorLabel(term.actorUserId, labelsByUserId)
      : null;
    const occurredAt = term?.createdAt.toISOString() ?? null;
    const actorPart = actorLabel ? ` by ${actorLabel}` : '';
    return {
      level: 'success',
      text: `Termination successfully completed${actorPart} — security deposit settled immediately. Contract is Closed.`,
      occurredAt,
      actorLabel,
    };
  }
  if (rawStatus === 'pending_termination') {
    const req = findLatestEventByType(events, 'contract.termination_requested');
    const actorLabel = req
      ? resolveActorLabel(req.actorUserId, labelsByUserId)
      : null;
    return {
      level: 'info',
      text: actorLabel
        ? `Termination requested by ${actorLabel} — awaiting Contract Admin approval.`
        : 'Termination requested — awaiting Contract Admin approval.',
      occurredAt: req?.createdAt.toISOString() ?? null,
      actorLabel,
    };
  }
  return null;
}

export function buildAvailableActions(input: {
  rawStatus: LeaseContractStatus;
  canPauseBilling: boolean;
  hasPendingTerminationApproval: boolean;
}): AvailableActionsMap {
  const { rawStatus, canPauseBilling, hasPendingTerminationApproval } = input;
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

  let requestTermination: AvailableAction;
  if (!['deactivated', 'billing_paused'].includes(rawStatus)) {
    requestTermination = deny('Terminate from deactivated/on-hold state only');
  } else if (hasPendingTerminationApproval) {
    requestTermination = deny('Termination already pending approval');
  } else {
    requestTermination = allow();
  }

  const approveTermination =
    rawStatus === 'pending_termination'
      ? allow()
      : deny('No termination pending approval');

  const renew = RENEWABLE_CONTRACT_STATUSES.includes(rawStatus)
    ? allow()
    : deny(
        'Renewal is available for active, awaiting assets, or completed contracts',
      );

  return {
    editContract,
    deactivate,
    reactivate,
    pauseBilling,
    requestTermination,
    approveTermination,
    renew,
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
