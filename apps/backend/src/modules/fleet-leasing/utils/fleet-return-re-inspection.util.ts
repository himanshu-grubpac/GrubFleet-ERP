/**
 * Screen 6 — post-workshop re-inspection worksheet and presentation.
 */

import {
  FLEET_RETURN_INSPECTION_SECTION_CATALOG,
  type FleetReturnInspectionSectionId,
  type FleetReturnInspectionWorksheet,
} from '../constants/fleet-return-inspection-sections.constants';
import type { FleetReturnInspectionResultPresentation } from './fleet-return-inspection-result.util';

export type FleetReturnReInspectionStatus =
  'not_started' | 'in_progress' | 'completed';

export type FleetReturnReInspectionOutcome =
  'ready_to_lease' | 'back_to_workshop';

export type FleetReturnReInspectionItemRating = 'pass' | 'minor' | 'major';

export type FleetReturnReInspectionWorksheetItem = {
  itemKey: string;
  sectionId: FleetReturnInspectionSectionId;
  label: string;
  priorRating: 'minor' | 'major';
  priorDetail: string;
  rating: FleetReturnReInspectionItemRating;
};

export type FleetReturnReInspectionPoolChecklist = {
  roadTestDone: boolean;
  washedCleaned: boolean;
  fuelLevelChecked: boolean;
  insuranceValidAck: boolean;
  pucValidAck: boolean;
};

export type FleetReturnReInspectionWorksheet = {
  items: FleetReturnReInspectionWorksheetItem[];
  poolChecklist: FleetReturnReInspectionPoolChecklist;
  odometerAfterRoadTest: number | null;
  selectedOutcome: FleetReturnReInspectionOutcome | null;
  workshopActualCostMinor: number | null;
};

export type FleetReturnReInspectionPresentation = {
  status: FleetReturnReInspectionStatus;
  displayNumber: string;
  eligible: boolean;
  reasonIneligible?: string;
  statusBanner: { level: 'info' | 'warning'; message: string } | null;
  jobCardDisplayNumber: string | null;
  jobCardClosedAt: string | null;
  worksheet: FleetReturnReInspectionWorksheet | null;
  outcomeSummary: {
    workshopCostActualMinor: number | null;
    workshopCostEstimateMinor: number | null;
    recoveryNoteUnchanged: boolean;
  };
  availableActions: Array<{
    actionKey: 'save_exit' | 'mark_ready_to_lease';
    label: string;
    variant: 'primary' | 'secondary';
    enabled: boolean;
    reasonDisabled?: string;
  }>;
};

function itemKey(
  sectionId: FleetReturnInspectionSectionId,
  key: string,
): string {
  return `${sectionId}:${key}`;
}

function priorDetailFromRating(
  rating: 'minor' | 'major',
  label: string,
): string {
  const action =
    rating === 'major'
      ? `replaced`
      : label.toLowerCase().includes('tyre')
        ? '2 new tyres'
        : label.toLowerCase().includes('livery')
          ? 'removed'
          : 'repaired';
  return `${rating === 'major' ? 'Major' : 'Minor'} · ${action}`;
}

export function buildInitialReInspectionWorksheet(
  initialWorksheet: FleetReturnInspectionWorksheet,
  odometerReading: number,
  repairEstimateMinor: number,
): FleetReturnReInspectionWorksheet {
  const items: FleetReturnReInspectionWorksheetItem[] = [];
  for (const section of FLEET_RETURN_INSPECTION_SECTION_CATALOG) {
    const rows = initialWorksheet.sections[section.id] ?? {};
    for (const catalogItem of section.items) {
      const row = rows[catalogItem.key];
      if (!row || row.rating === 'pass' || row.rating === 'unchecked') continue;
      if (row.rating !== 'minor' && row.rating !== 'major') continue;
      items.push({
        itemKey: itemKey(section.id, catalogItem.key),
        sectionId: section.id,
        label: catalogItem.label,
        priorRating: row.rating,
        priorDetail: priorDetailFromRating(row.rating, catalogItem.label),
        rating: 'pass',
      });
    }
  }
  return {
    items,
    poolChecklist: {
      roadTestDone: false,
      washedCleaned: false,
      fuelLevelChecked: false,
      insuranceValidAck: false,
      pucValidAck: false,
    },
    odometerAfterRoadTest: odometerReading,
    selectedOutcome: 'ready_to_lease',
    workshopActualCostMinor:
      repairEstimateMinor > 0 ? repairEstimateMinor : null,
  };
}

export function formatReInspectionDisplayNumber(
  inspectionCreatedAt: Date,
  inspectionId: string,
  revision: number,
): string {
  const year = inspectionCreatedAt.getUTCFullYear();
  const suffix = inspectionId.replace(/-/g, '').slice(0, 4).toUpperCase();
  return `INS-${year}-${suffix}-R${revision}`;
}

export function reInspectionWorksheetIsComplete(
  worksheet: FleetReturnReInspectionWorksheet,
): boolean {
  if (worksheet.items.length === 0) return false;
  if (worksheet.items.some((i) => i.rating !== 'pass')) return false;
  const c = worksheet.poolChecklist;
  if (
    !c.roadTestDone ||
    !c.washedCleaned ||
    !c.fuelLevelChecked ||
    !c.insuranceValidAck ||
    !c.pucValidAck
  ) {
    return false;
  }
  if (
    worksheet.odometerAfterRoadTest == null ||
    worksheet.odometerAfterRoadTest <= 0
  ) {
    return false;
  }
  return worksheet.selectedOutcome === 'ready_to_lease';
}

export function buildReInspectionPresentation(input: {
  inspectionId: string;
  inspectionCreatedAt: Date;
  reInspectionStatus: FleetReturnReInspectionStatus;
  workshopRepairClosedAt: Date | null;
  inspectionResult: FleetReturnInspectionResultPresentation | null;
  worksheet: FleetReturnReInspectionWorksheet | null;
  repairEstimateMinor: number;
}): FleetReturnReInspectionPresentation {
  const outcome = input.inspectionResult?.outcome;
  const jobCard = input.inspectionResult?.jobCard ?? null;
  const eligible =
    outcome === 'sent_to_workshop' &&
    Boolean(input.workshopRepairClosedAt) &&
    input.reInspectionStatus !== 'completed';

  let reasonIneligible: string | undefined;
  if (outcome !== 'sent_to_workshop') {
    reasonIneligible = 'Re-inspection applies only after a workshop send-off.';
  } else if (!input.workshopRepairClosedAt) {
    reasonIneligible =
      'Mark workshop repair complete before starting re-inspection.';
  } else if (input.reInspectionStatus === 'completed') {
    reasonIneligible = 'Re-inspection is already completed for this return.';
  }

  const displayNumber = formatReInspectionDisplayNumber(
    input.inspectionCreatedAt,
    input.inspectionId,
    1,
  );

  const canComplete =
    eligible &&
    input.worksheet != null &&
    reInspectionWorksheetIsComplete(input.worksheet);

  let statusBanner: { level: 'info' | 'warning'; message: string } | null =
    null;
  if (input.reInspectionStatus === 'completed') {
    statusBanner = {
      level: 'info',
      message:
        'Re-inspection is already complete for this vehicle. Open the inspection result for the updated outcome.',
    };
  } else if (!eligible && reasonIneligible) {
    statusBanner = {
      level: 'warning',
      message: reasonIneligible,
    };
  }

  return {
    status: input.reInspectionStatus,
    displayNumber,
    eligible,
    reasonIneligible,
    statusBanner,
    jobCardDisplayNumber: jobCard?.displayNumber ?? null,
    jobCardClosedAt: input.workshopRepairClosedAt?.toISOString() ?? null,
    worksheet: input.worksheet,
    outcomeSummary: {
      workshopCostActualMinor:
        input.worksheet?.workshopActualCostMinor ?? input.repairEstimateMinor,
      workshopCostEstimateMinor: input.repairEstimateMinor,
      recoveryNoteUnchanged: true,
    },
    availableActions: [
      {
        actionKey: 'save_exit',
        label: 'Save & exit',
        variant: 'secondary',
        enabled: eligible && input.reInspectionStatus !== 'completed',
      },
      {
        actionKey: 'mark_ready_to_lease',
        label: 'Mark ready to lease',
        variant: 'primary',
        enabled: canComplete,
        ...(!canComplete && eligible
          ? {
              reasonDisabled:
                'Pass all repaired items, complete the pool checklist, and confirm outcome.',
            }
          : {}),
      },
    ],
  };
}

export function mergeReInspectionIntoInspectionResult(
  stored: FleetReturnInspectionResultPresentation,
  completedAt: Date,
  actualRepairMinor: number,
  options?: { reInspectorDisplayName?: string | null },
): FleetReturnInspectionResultPresentation {
  const inspector =
    options?.reInspectorDisplayName?.trim() || 'Fleet inspector';
  const recoveryRef = stored.recoveryNote.displayNumber;
  const jobRef = stored.jobCard?.displayNumber ?? 'Job card';
  const inspectedAt = new Date(stored.generatedAt);
  const inspectedLabel = inspectedAt.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });
  const reInspectLabel = completedAt.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });

  const timeline = stored.timeline.map((step) => {
    if (step.key === 'inspected') {
      return {
        ...step,
        label: 'Inspected · sent to workshop',
        detail: `${inspectedLabel} · Recovery note ${recoveryRef}`,
        state: 'done' as const,
      };
    }
    if (step.key === 'workshop') {
      return {
        ...step,
        label: 'Repaired',
        detail: `${reInspectLabel} · ${jobRef} closed`,
        state: 'done' as const,
      };
    }
    if (step.key === 'reinspect') {
      return {
        ...step,
        label: 'Re-inspected · ready to lease',
        state: 'done' as const,
        detail: `${reInspectLabel} · ${inspector}`,
      };
    }
    if (step.key === 'available') {
      return { ...step, state: 'done' as const };
    }
    return step;
  });

  return {
    ...stored,
    outcome: 'ready_to_lease',
    timeline,
    metrics: {
      ...stored.metrics,
      repairCostMinor: actualRepairMinor,
    },
    statusBanner: {
      level: 'info',
      message:
        'Re-inspection is complete. This vehicle is back in the Available pool — use Asset Assignment when a contract needs this asset class.',
    },
    contractClosingProgress: stored.contractClosingProgress ?? null,
    assignmentPoolBanner: stored.assignmentPoolBanner ?? null,
    jobCard: stored.jobCard
      ? { ...stored.jobCard, status: 'closed' }
      : stored.jobCard,
    availableActions: stored.availableActions.map((action) => {
      if (action.actionKey === 'assign_contract') {
        return {
          ...action,
          variant: 'primary' as const,
          enabled: true,
          reasonDisabled: undefined,
        };
      }
      if (action.actionKey === 'next_to_inspect') {
        return { ...action, enabled: false, variant: 'secondary' as const };
      }
      return action;
    }),
  };
}
