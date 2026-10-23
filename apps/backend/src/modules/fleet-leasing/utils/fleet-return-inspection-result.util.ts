/**
 * Screen 5 — post-inspection outcome presentation (Figma flows).
 * Persisted on complete; rebuilt on read when missing (legacy rows).
 */

import {
  FLEET_RETURN_INSPECTION_SECTION_CATALOG,
  type FleetReturnInspectionSummary,
  type FleetReturnInspectionWorksheet,
} from '../constants/fleet-return-inspection-sections.constants';
import {
  defaultIssueChargeForAttribution,
  issueChargeKey,
  type FleetReturnInspectionFinalizeDraft,
  type FleetReturnInspectionDisposition,
} from '../constants/fleet-return-inspection-finalize.constants';

/** ₹4 per excess km (matches Figma RN-2026-0052 example: 3,420 km → ₹13,680). */
export const FLEET_RETURN_EXCESS_KM_RATE_MINOR = 400;

const FLEET_RETURN_WORKSHOP_JOB_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Workshop deep-link id — must be a real work order UUID, not synthetic JC-* labels. */
export function isFleetReturnWorkshopJobId(
  value: string | null | undefined,
): value is string {
  const trimmed = value?.trim();
  return Boolean(trimmed && FLEET_RETURN_WORKSHOP_JOB_ID_PATTERN.test(trimmed));
}

export function resolveFleetReturnWorkshopJobId(
  ...candidates: Array<string | null | undefined>
): string | null {
  for (const candidate of candidates) {
    if (isFleetReturnWorkshopJobId(candidate)) {
      return candidate.trim();
    }
  }
  return null;
}

export type FleetReturnInspectionResultOutcome =
  'sent_to_workshop' | 'ready_to_lease' | 'on_hold' | 'retired';

export type FleetReturnInspectionResultActionKey =
  | 'back_to_list'
  | 'next_to_inspect'
  | 'open_workshop'
  | 'close_workshop_repair'
  | 'assign_contract'
  | 'vehicle_history';

export type FleetReturnContractClosingProgress = {
  returnedCount: number;
  totalCount: number;
};

export type FleetReturnAssignmentPoolBanner = {
  contractsWaitingCount: number;
  assetClassName: string;
};

export type FleetReturnInspectionResultPresentation = {
  outcome: FleetReturnInspectionResultOutcome;
  generatedAt: string;
  jobCard: {
    displayNumber: string;
    status: 'open' | 'closed';
    workshopJobId: string | null;
    depotLabel: string | null;
    priority: 'normal' | 'high' | 'urgent';
    targetReadyDate: string | null;
    tasks: Array<{ label: string; status: 'todo' | 'done' }>;
  } | null;
  recoveryNote: {
    displayNumber: string;
    status:
      | 'none'
      | 'waiting_for_finance'
      | 'unpaid'
      | 'partially_paid'
      | 'paid'
      | 'cancelled';
    financeInvoiceId?: string | null;
    financeInvoiceStatus?:
      'unpaid' | 'partially_paid' | 'paid' | 'cancelled' | null;
    lines: Array<{ label: string; amountMinor: number }>;
    totalMinor: number;
    billedToClientName: string;
    contractFootnote: string;
  };
  timeline: Array<{
    key: string;
    label: string;
    detail: string;
    state: 'done' | 'active' | 'pending';
  }>;
  metrics: {
    offLeaseDays: number | null;
    repairCostMinor: number;
    recoveryTotalMinor: number;
  };
  statusBanner: { level: 'success' | 'info'; message: string } | null;
  contractClosingProgress: FleetReturnContractClosingProgress | null;
  assignmentPoolBanner: FleetReturnAssignmentPoolBanner | null;
  availableActions: Array<{
    actionKey: FleetReturnInspectionResultActionKey;
    label: string;
    variant: 'primary' | 'secondary' | 'ghost';
    enabled: boolean;
    reasonDisabled?: string;
    workshopJobId?: string | null;
    assetRegisterVehicleId?: string | null;
  }>;
};

export type FleetReturnInspectionResultStatusBannerInput = {
  fleetLabel: string;
  outcome: FleetReturnInspectionResultOutcome;
  workshopRepairClosedAt: Date | null;
  workshopJobId: string | null;
  workshopWorkOrderNumber: string | null;
  jobCardDisplayNumber: string | null;
  jobCardStatus: 'open' | 'closed' | null;
};

/** Live banner copy for inspection result — rebuilt on GET detail (not static FE copy). */
export function buildFleetReturnInspectionResultStatusBanner(
  input: FleetReturnInspectionResultStatusBannerInput,
): { level: 'success' | 'info'; message: string } | null {
  const fleetLabel = input.fleetLabel.trim() || 'This vehicle';
  const jobRef =
    input.workshopWorkOrderNumber?.trim() ||
    input.jobCardDisplayNumber?.trim() ||
    null;
  const repairClosed =
    input.workshopRepairClosedAt != null || input.jobCardStatus === 'closed';

  if (input.outcome === 'sent_to_workshop') {
    if (repairClosed) {
      return {
        level: 'info',
        message: `${fleetLabel} repair is complete${jobRef ? ` (${jobRef})` : ''}. It shows as Repair done on Vehicle Returns — start re-inspection when ready.`,
      };
    }
    if (isFleetReturnWorkshopJobId(input.workshopJobId) || jobRef) {
      const jobPhrase = jobRef ? ` Work order ${jobRef} is open.` : '';
      return {
        level: 'info',
        message: `${fleetLabel} is in the workshop.${jobPhrase} Closing the work order in Workshop updates this return automatically for re-inspection.`,
      };
    }
    return {
      level: 'info',
      message: `${fleetLabel} was sent to the workshop after inspection. Link a work order to track repair progress here.`,
    };
  }

  if (input.outcome === 'on_hold') {
    return {
      level: 'info',
      message: `${fleetLabel} remains on return hold until operations clears the hold.`,
    };
  }

  if (input.outcome === 'retired') {
    return {
      level: 'info',
      message: `${fleetLabel} was marked retired after this inspection.`,
    };
  }

  return {
    level: 'info',
    message: `${fleetLabel} is back in the Available pool. It now shows in Asset Assignment when contracts need this asset class.`,
  };
}

export type EnrichInspectionResultContext = {
  fleetLabel: string;
  assetClassName: string;
  assetClassId: string | null;
  assetRegisterVehicleId: string | null;
  vehicleStatus: string;
  contractsWaitingForAssetClass: number;
  contractClosingProgress: FleetReturnContractClosingProgress | null;
  reInspectionCompletedAt: Date | null;
  workshopRepairClosedAt: Date | null;
  workshopJobId: string | null;
  workshopWorkOrderNumber: string | null;
  reInspectorDisplayName: string | null;
  contractStatus: string;
  contractClosingReason: string | null;
  inspectionCompletedAt: Date;
  receivedAt: Date | null;
  odometerReading: number;
  depotLabel: string | null;
  contractExpectedReturnBy: Date | null;
  contractEndDate: Date | null;
  inspectionCreatedAt: Date;
};

export type BuildInspectionResultInput = {
  inspectionId: string;
  inspectionCreatedAt: Date;
  inspectionCompletedAt: Date;
  receivedAt: Date | null;
  odometerReading: number;
  fleetCode: string;
  registrationNo: string;
  clientName: string;
  contractNumber: string;
  contractStatus: string;
  contractClosingReason: string | null;
  contractEndDate: Date | null;
  contractExpectedReturnBy: Date | null;
  depotLabel: string | null;
  vehicleStatus: string;
  workshopJobId: string | null;
  workshopJobDisplayNumber?: string | null;
  worksheet: FleetReturnInspectionWorksheet;
  summary: FleetReturnInspectionSummary;
  storedResult?: unknown;
  finalize?: FleetReturnInspectionFinalizeDraft | null;
};

function resolveOutcomeFromFinalize(
  finalize: FleetReturnInspectionFinalizeDraft | null | undefined,
  summary: FleetReturnInspectionSummary,
): FleetReturnInspectionResultOutcome {
  const disposition = finalize?.disposition;
  if (disposition === 'send_to_workshop') return 'sent_to_workshop';
  if (disposition === 'ready_to_lease') return 'ready_to_lease';
  if (disposition === 'on_hold') return 'on_hold';
  if (disposition === 'retire') return 'retired';
  return summary.majorCount > 0 ? 'sent_to_workshop' : 'ready_to_lease';
}

export function resolveVehicleStatusForFinalize(
  disposition: FleetReturnInspectionDisposition,
): 'workshop' | 'available' | 'returned' | 'retired' {
  if (disposition === 'send_to_workshop') return 'workshop';
  if (disposition === 'ready_to_lease') return 'available';
  if (disposition === 'retire') return 'retired';
  return 'returned';
}

function shouldCreateWorkshopJob(
  outcome: FleetReturnInspectionResultOutcome,
): boolean {
  return outcome === 'sent_to_workshop';
}

function formatDisplaySuffix(id: string): string {
  return id.replace(/-/g, '').slice(0, 4).toUpperCase();
}

export function formatFleetReturnJobCardDisplayNumber(
  completedAt: Date,
  inspectionId: string,
): string {
  return `JC-${completedAt.getUTCFullYear()}-${formatDisplaySuffix(inspectionId)}`;
}

function formatJobCardNumber(completedAt: Date, inspectionId: string): string {
  return formatFleetReturnJobCardDisplayNumber(completedAt, inspectionId);
}

function formatRecoveryNoteNumber(
  completedAt: Date,
  inspectionId: string,
): string {
  return `RN-${completedAt.getUTCFullYear()}-${formatDisplaySuffix(inspectionId)}`;
}

function startOfUtcDayMs(d: Date): number {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

function computeOffLeaseDays(input: BuildInspectionResultInput): number | null {
  const due = input.contractExpectedReturnBy ?? input.contractEndDate ?? null;
  if (!due) return null;
  const received = input.receivedAt ?? input.inspectionCompletedAt;
  const diffMs = startOfUtcDayMs(received) - startOfUtcDayMs(due);
  if (diffMs <= 0) return 0;
  return Math.ceil(diffMs / (24 * 60 * 60 * 1000));
}

function collectFailedItems(worksheet: FleetReturnInspectionWorksheet): Array<{
  label: string;
  rating: 'minor' | 'major';
  attribution?: string;
  repairCostMinor?: number;
}> {
  const out: Array<{
    label: string;
    rating: 'minor' | 'major';
    attribution?: string;
    repairCostMinor?: number;
  }> = [];
  for (const section of FLEET_RETURN_INSPECTION_SECTION_CATALOG) {
    const items = worksheet.sections[section.id] ?? {};
    for (const item of section.items) {
      const row = items[item.key];
      if (!row || row.rating === 'pass' || row.rating === 'unchecked') continue;
      if (row.rating === 'minor' || row.rating === 'major') {
        out.push({
          label: item.label,
          rating: row.rating,
          attribution: row.attribution,
          repairCostMinor: row.repairCostMinor,
        });
      }
    }
  }
  return out;
}

function buildRecoveryLines(
  worksheet: FleetReturnInspectionWorksheet,
  summary: FleetReturnInspectionSummary,
  finalize?: FleetReturnInspectionFinalizeDraft | null,
): Array<{ label: string; amountMinor: number }> {
  if (finalize?.waiveAllRecovery) {
    return [];
  }

  const lines: Array<{ label: string; amountMinor: number }> = [];
  let clientDamageMinor = 0;
  let missingMinor = 0;

  for (const section of FLEET_RETURN_INSPECTION_SECTION_CATALOG) {
    const items = worksheet.sections[section.id] ?? {};
    for (const item of section.items) {
      const row = items[item.key];
      if (!row || row.rating === 'pass' || row.rating === 'unchecked') {
        continue;
      }
      if (row.rating !== 'minor' && row.rating !== 'major') continue;

      const key = issueChargeKey(section.id, item.key);
      const chargeClient =
        finalize?.issueCharges[key] ??
        defaultIssueChargeForAttribution(row.attribution);
      if (!chargeClient) continue;

      const cost = row.repairCostMinor ?? 0;
      if (row.attribution === 'client_damage' && cost > 0) {
        clientDamageMinor += cost;
      }
      if (row.attribution === 'missing') {
        missingMinor += cost > 0 ? cost : 2_500_00;
      }
    }
  }

  if (clientDamageMinor > 0) {
    lines.push({ label: 'Client damage', amountMinor: clientDamageMinor });
  }
  if (summary.excessKm > 0) {
    lines.push({
      label: `Excess km (${summary.excessKm.toLocaleString('en-IN')})`,
      amountMinor: summary.excessKm * FLEET_RETURN_EXCESS_KM_RATE_MINOR,
    });
  }
  if (missingMinor > 0) {
    lines.push({ label: 'Missing items', amountMinor: missingMinor });
  }

  return lines;
}

function taskLabelFromFailed(item: {
  label: string;
  rating: 'minor' | 'major';
}): string {
  if (item.rating === 'major') {
    return `Replace ${item.label.toLowerCase()}`;
  }
  return `Repair ${item.label.toLowerCase()}`;
}

function formatShortDate(d: Date): string {
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });
}

function formatDateTime(d: Date): string {
  return d.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  });
}

function closingReasonPhrase(reason: string | null): string {
  if (reason === 'completed') return 'lease completed';
  if (reason === 'terminated_early') return 'terminated early';
  if (reason === 'cancelled') return 'cancelled';
  return 'return initiated';
}

export function buildFleetReturnInspectionResult(
  input: BuildInspectionResultInput,
): FleetReturnInspectionResultPresentation {
  if (
    input.storedResult &&
    typeof input.storedResult === 'object' &&
    input.storedResult !== null &&
    'outcome' in input.storedResult &&
    'generatedAt' in input.storedResult
  ) {
    const stored =
      input.storedResult as FleetReturnInspectionResultPresentation;
    if (stored.outcome && stored.generatedAt) {
      return normalizeStoredInspectionResult(
        mergeStoredWithLiveWorkshopJob(stored, input.workshopJobId),
      );
    }
  }

  const completedAt = input.inspectionCompletedAt;
  const outcome = resolveOutcomeFromFinalize(input.finalize, input.summary);

  const failedItems = collectFailedItems(input.worksheet);
  const recoveryLines = buildRecoveryLines(
    input.worksheet,
    input.summary,
    input.finalize,
  );
  const recoveryTotalMinor = recoveryLines.reduce(
    (sum, line) => sum + line.amountMinor,
    0,
  );

  const targetReady = new Date(completedAt);
  targetReady.setUTCDate(targetReady.getUTCDate() + 4);
  const workshopTargetFromDraft = input.finalize?.workshopTargetDate?.trim();
  const jobCardTargetDate =
    workshopTargetFromDraft &&
    /^\d{4}-\d{2}-\d{2}$/.test(workshopTargetFromDraft)
      ? workshopTargetFromDraft
      : targetReady.toISOString().slice(0, 10);
  const workshopPriority =
    input.finalize?.workshopPriority ?? ('normal' as const);

  const linkedWorkshopJobIdForCard = resolveFleetReturnWorkshopJobId(
    input.workshopJobId,
  );
  const jobCard = shouldCreateWorkshopJob(outcome)
    ? {
        displayNumber:
          input.workshopJobDisplayNumber?.trim() ||
          formatJobCardNumber(completedAt, input.inspectionId),
        status: 'open' as const,
        workshopJobId: linkedWorkshopJobIdForCard,
        depotLabel: input.depotLabel,
        priority: workshopPriority,
        targetReadyDate: jobCardTargetDate,
        tasks: failedItems.map((item) => ({
          label: taskLabelFromFailed(item),
          status: 'todo' as const,
        })),
      }
    : null;

  const recoveryNote = {
    displayNumber: formatRecoveryNoteNumber(completedAt, input.inspectionId),
    status:
      recoveryTotalMinor > 0
        ? ('waiting_for_finance' as const)
        : ('none' as const),
    lines: recoveryLines,
    totalMinor: recoveryTotalMinor,
    billedToClientName: input.clientName,
    contractFootnote: `Contract ${input.contractNumber} stays in Closing until recovery is invoiced or waived and all linked vehicles are received.`,
  };

  const initiatedDate =
    input.contractExpectedReturnBy ??
    input.contractEndDate ??
    input.inspectionCreatedAt;
  const timeline: FleetReturnInspectionResultPresentation['timeline'] = [
    {
      key: 'initiated',
      label: 'Return initiated',
      detail: `${formatShortDate(initiatedDate)} · ${closingReasonPhrase(input.contractClosingReason)}`,
      state: 'done',
    },
  ];

  if (input.receivedAt) {
    timeline.push({
      key: 'received',
      label: `Received at ${input.depotLabel?.trim() || 'depot'}`,
      detail: `${formatDateTime(input.receivedAt)} · ${input.odometerReading.toLocaleString('en-IN')} km`,
      state: 'done',
    });
  }

  timeline.push({
    key: 'inspected',
    label: 'Inspected',
    detail: `${formatShortDate(completedAt)} · ${input.summary.majorCount} major, ${input.summary.minorCount} minor`,
    state: 'done',
  });

  if (outcome === 'sent_to_workshop') {
    timeline.push({
      key: 'workshop',
      label: 'In workshop',
      detail: `Since ${formatShortDate(completedAt)} · ${jobCard?.displayNumber ?? 'Job card'}`,
      state: 'active',
    });
    timeline.push({
      key: 'reinspect',
      label: 'Re-inspection',
      detail: `Only the ${failedItems.length} repaired item${failedItems.length === 1 ? '' : 's'}`,
      state: 'pending',
    });
    timeline.push({
      key: 'available',
      label: 'Available',
      detail: 'Back in Asset Assignment',
      state: 'pending',
    });
  } else {
    timeline.push({
      key: 'available',
      label: 'Available',
      detail: 'Back in Asset Assignment',
      state: 'done',
    });
  }

  const fleetLabel = input.fleetCode || input.registrationNo;
  const statusBanner = buildFleetReturnInspectionResultStatusBanner({
    fleetLabel,
    outcome,
    workshopRepairClosedAt: null,
    workshopJobId: input.workshopJobId,
    workshopWorkOrderNumber: input.workshopJobDisplayNumber ?? null,
    jobCardDisplayNumber: jobCard?.displayNumber ?? null,
    jobCardStatus: jobCard?.status ?? null,
  });

  const availableActions: FleetReturnInspectionResultPresentation['availableActions'] =
    [
      {
        actionKey: 'back_to_list',
        label: 'Back to Vehicle Returns',
        variant: 'secondary',
        enabled: true,
      },
    ];

  if (outcome === 'sent_to_workshop') {
    const linkedWorkshopJobId = resolveFleetReturnWorkshopJobId(
      input.workshopJobId,
    );
    availableActions.push({
      actionKey: 'open_workshop',
      label: 'Open in Workshop',
      variant: 'secondary',
      enabled: Boolean(linkedWorkshopJobId),
      workshopJobId: linkedWorkshopJobId,
      ...(!linkedWorkshopJobId
        ? {
            reasonDisabled:
              'No open workshop job is linked for this vehicle yet.',
          }
        : {}),
    });
    availableActions.push({
      actionKey: 'next_to_inspect',
      label: 'Next vehicle to inspect',
      variant: 'primary',
      enabled: true,
    });
  } else {
    availableActions.push({
      actionKey: 'vehicle_history',
      label: 'Vehicle history',
      variant: 'secondary',
      enabled: false,
      reasonDisabled:
        'Fleet register record is not linked for this registration.',
    });
    availableActions.push({
      actionKey: 'assign_contract',
      label: 'Assign to a contract',
      variant: 'primary',
      enabled: false,
      reasonDisabled:
        'Vehicle must be available and linked to the fleet register before assigning.',
    });
  }

  return {
    outcome,
    generatedAt: completedAt.toISOString(),
    jobCard,
    recoveryNote,
    timeline,
    metrics: {
      offLeaseDays: computeOffLeaseDays(input),
      repairCostMinor: input.summary.repairEstimateMinor,
      recoveryTotalMinor,
    },
    statusBanner,
    contractClosingProgress: null,
    assignmentPoolBanner: null,
    availableActions,
  };
}

function buildReadyToLeaseAfterWorkshopTimeline(
  ctx: EnrichInspectionResultContext,
  result: FleetReturnInspectionResultPresentation,
): FleetReturnInspectionResultPresentation['timeline'] {
  const initiatedDate =
    ctx.contractExpectedReturnBy ??
    ctx.contractEndDate ??
    ctx.inspectionCreatedAt;
  const recoveryRef = result.recoveryNote.displayNumber;
  const jobRef = result.jobCard?.displayNumber ?? 'Job card';
  const workshopClosed =
    ctx.workshopRepairClosedAt ?? ctx.reInspectionCompletedAt;
  const reInspectAt = ctx.reInspectionCompletedAt ?? ctx.inspectionCompletedAt;
  const inspector = ctx.reInspectorDisplayName?.trim() || 'Fleet inspector';

  const timeline: FleetReturnInspectionResultPresentation['timeline'] = [
    {
      key: 'initiated',
      label: 'Return initiated',
      detail: `${formatShortDate(initiatedDate)} · ${closingReasonPhrase(ctx.contractClosingReason)}`,
      state: 'done',
    },
  ];
  if (ctx.receivedAt) {
    timeline.push({
      key: 'received',
      label: `Received at ${ctx.depotLabel?.trim() || 'depot'}`,
      detail: `${formatDateTime(ctx.receivedAt)} · ${ctx.odometerReading.toLocaleString('en-IN')} km`,
      state: 'done',
    });
  }
  timeline.push({
    key: 'inspected',
    label: 'Inspected · sent to workshop',
    detail: `${formatShortDate(ctx.inspectionCompletedAt)} · Recovery note ${recoveryRef}`,
    state: 'done',
  });
  timeline.push({
    key: 'workshop',
    label: 'Repaired',
    detail: workshopClosed
      ? `${formatShortDate(workshopClosed)} · ${jobRef} closed`
      : `${jobRef} closed`,
    state: 'done',
  });
  timeline.push({
    key: 'reinspect',
    label: 'Re-inspected · ready to lease',
    detail: `${formatShortDate(reInspectAt)} · ${inspector}`,
    state: 'done',
  });
  return timeline;
}

/** Live counts, banner copy, timeline parity, and action gates on GET detail. */
export function enrichFleetReturnInspectionResult(
  result: FleetReturnInspectionResultPresentation,
  ctx: EnrichInspectionResultContext,
): FleetReturnInspectionResultPresentation {
  const assetClassName = ctx.assetClassName;
  const assignmentPoolBanner: FleetReturnAssignmentPoolBanner | null =
    result.outcome === 'ready_to_lease' && ctx.vehicleStatus === 'available'
      ? {
          contractsWaitingCount: ctx.contractsWaitingForAssetClass,
          assetClassName,
        }
      : null;

  let jobCard = result.jobCard;
  const liveJobId = resolveFleetReturnWorkshopJobId(
    ctx.workshopJobId,
    jobCard?.workshopJobId,
  );
  const liveJobNumber = ctx.workshopWorkOrderNumber?.trim();
  if (jobCard && liveJobNumber) {
    jobCard = {
      ...jobCard,
      displayNumber: liveJobNumber,
      workshopJobId: liveJobId ?? jobCard.workshopJobId,
    };
  } else if (jobCard && liveJobId) {
    jobCard = { ...jobCard, workshopJobId: liveJobId };
  }
  if (jobCard && ctx.workshopRepairClosedAt) {
    jobCard = { ...jobCard, status: 'closed' };
  }

  let statusBanner = result.statusBanner;
  if (result.outcome === 'sent_to_workshop') {
    statusBanner = buildFleetReturnInspectionResultStatusBanner({
      fleetLabel: ctx.fleetLabel,
      outcome: result.outcome,
      workshopRepairClosedAt: ctx.workshopRepairClosedAt,
      workshopJobId: liveJobId,
      workshopWorkOrderNumber: ctx.workshopWorkOrderNumber,
      jobCardDisplayNumber: jobCard?.displayNumber ?? null,
      jobCardStatus: jobCard?.status ?? null,
    });
  }

  if (
    result.outcome === 'ready_to_lease' &&
    ctx.vehicleStatus === 'available' &&
    assignmentPoolBanner
  ) {
    const count = assignmentPoolBanner.contractsWaitingCount;
    const countPhrase =
      count === 0
        ? 'No contracts are waiting'
        : count === 1
          ? '1 contract is waiting'
          : `${count} contracts are waiting`;
    statusBanner = {
      level: 'info',
      message: `${countPhrase} for ${assetClassName} in Asset Assignment. This vehicle is back in the Available pool.`,
    };
  }

  let timeline = result.timeline;
  const wentThroughWorkshop =
    result.jobCard != null ||
    ctx.workshopRepairClosedAt != null ||
    ctx.reInspectionCompletedAt != null;
  if (result.outcome === 'ready_to_lease' && wentThroughWorkshop) {
    timeline = buildReadyToLeaseAfterWorkshopTimeline(ctx, result);
  }

  const hasFleetRegisterLink = Boolean(ctx.assetRegisterVehicleId?.trim());
  const canAssign =
    result.outcome === 'ready_to_lease' &&
    ctx.vehicleStatus === 'available' &&
    hasFleetRegisterLink;
  const canViewHistory = hasFleetRegisterLink;
  const fleetRegisterLinkReason =
    'Fleet register record is not linked for this registration.';

  const availableActions = result.availableActions.map((action) => {
    if (action.actionKey === 'assign_contract') {
      return {
        ...action,
        variant: 'primary' as const,
        enabled: canAssign,
        assetRegisterVehicleId: ctx.assetRegisterVehicleId,
        reasonDisabled: canAssign
          ? undefined
          : !hasFleetRegisterLink
            ? fleetRegisterLinkReason
            : 'Vehicle must be available before assigning to a contract.',
      };
    }
    if (action.actionKey === 'vehicle_history') {
      return {
        ...action,
        enabled: canViewHistory,
        assetRegisterVehicleId: ctx.assetRegisterVehicleId,
        reasonDisabled: canViewHistory ? undefined : fleetRegisterLinkReason,
      };
    }
    if (action.actionKey === 'open_workshop') {
      const jobId = resolveFleetReturnWorkshopJobId(
        ctx.workshopJobId,
        action.workshopJobId,
        jobCard?.workshopJobId,
      );
      return {
        ...action,
        workshopJobId: jobId,
        enabled: Boolean(jobId),
        reasonDisabled: jobId
          ? undefined
          : 'No open workshop job is linked for this vehicle yet.',
      };
    }
    return action;
  });

  if (
    result.outcome === 'ready_to_lease' &&
    !availableActions.some((a) => a.actionKey === 'assign_contract')
  ) {
    availableActions.push({
      actionKey: 'assign_contract',
      label: 'Assign to a contract',
      variant: 'primary',
      enabled: canAssign,
      assetRegisterVehicleId: ctx.assetRegisterVehicleId,
      reasonDisabled: canAssign
        ? undefined
        : !hasFleetRegisterLink
          ? fleetRegisterLinkReason
          : 'Vehicle must be available before assigning to a contract.',
    });
  }
  if (
    result.outcome === 'ready_to_lease' &&
    !availableActions.some((a) => a.actionKey === 'vehicle_history')
  ) {
    availableActions.push({
      actionKey: 'vehicle_history',
      label: 'Vehicle history',
      variant: 'secondary',
      enabled: canViewHistory,
      assetRegisterVehicleId: ctx.assetRegisterVehicleId,
      reasonDisabled: canViewHistory ? undefined : fleetRegisterLinkReason,
    });
  }

  return {
    ...result,
    jobCard,
    timeline,
    statusBanner,
    contractClosingProgress: ctx.contractClosingProgress,
    assignmentPoolBanner,
    availableActions,
  };
}

function normalizeStoredInspectionResult(
  stored: FleetReturnInspectionResultPresentation,
): FleetReturnInspectionResultPresentation {
  return {
    ...stored,
    contractClosingProgress: stored.contractClosingProgress ?? null,
    assignmentPoolBanner: stored.assignmentPoolBanner ?? null,
  };
}

function mergeStoredWithLiveWorkshopJob(
  stored: FleetReturnInspectionResultPresentation,
  workshopJobId: string | null,
): FleetReturnInspectionResultPresentation {
  if (!stored.jobCard) {
    return refreshActionWorkshopLink(stored, workshopJobId);
  }
  const mergedJobId = resolveFleetReturnWorkshopJobId(
    workshopJobId,
    stored.jobCard.workshopJobId,
  );
  return refreshActionWorkshopLink(
    {
      ...stored,
      jobCard: {
        ...stored.jobCard,
        workshopJobId: mergedJobId,
      },
    },
    mergedJobId,
  );
}

function refreshActionWorkshopLink(
  result: FleetReturnInspectionResultPresentation,
  workshopJobId: string | null,
): FleetReturnInspectionResultPresentation {
  return {
    ...result,
    availableActions: result.availableActions.map((action) => {
      if (action.actionKey !== 'open_workshop') return action;
      const linkedJobId = resolveFleetReturnWorkshopJobId(workshopJobId);
      return {
        ...action,
        workshopJobId: linkedJobId,
        enabled: Boolean(linkedJobId),
        reasonDisabled: linkedJobId
          ? undefined
          : (action.reasonDisabled ??
            'No open workshop job is linked for this vehicle yet.'),
      };
    }),
  };
}
