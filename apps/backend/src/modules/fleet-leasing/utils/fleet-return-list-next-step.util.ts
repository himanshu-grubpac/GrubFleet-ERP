/** Figma Vehicle Returns list — NEXT STEP column (server presentation). */

export const FLEET_RETURN_NEXT_STEP_ACTION_KEYS = [
  'remind_client',
  'receive',
  'start_inspection',
  'continue_inspection',
  'finalize_inspection',
  'reinspect',
  'view_inspection_result',
  'view_job',
  'resolve_hold',
] as const;

export type FleetReturnNextStepActionKey =
  (typeof FLEET_RETURN_NEXT_STEP_ACTION_KEYS)[number];

export type FleetReturnNextStepVariant = 'primary' | 'secondary' | 'ghost';

export type FleetReturnNextStepPresentation = {
  actionKey: FleetReturnNextStepActionKey;
  label: string;
  variant: FleetReturnNextStepVariant;
  enabled: boolean;
  reasonDisabled?: string;
  /** When actionKey is view_job and a workshop work order exists. */
  workshopJobId?: string | null;
};

export type FleetReturnListNextStepInput = {
  vehicleStatus: string;
  inspectionStatus: string;
  expectedReturnDueDate: string | null;
  registeredReturn: boolean;
  workshopJobId?: string | null;
  /** Screen 6 — workshop repair marked complete. */
  workshopRepairClosed?: boolean;
  /** Product hold gate — no column yet; wire when schema ships. */
  returnOnHold?: boolean;
};

function startOfUtcDayMs(isoDate: string): number {
  const [y, m, d] = isoDate.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

function isReturnOverdue(input: FleetReturnListNextStepInput): boolean {
  if (
    input.vehicleStatus !== 'return_pending' ||
    !input.expectedReturnDueDate
  ) {
    return false;
  }
  const dueMs = startOfUtcDayMs(input.expectedReturnDueDate);
  const today = new Date();
  const todayMs = Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate(),
  );
  return todayMs > dueMs;
}

const REMIND_DISABLED_REASON = 'Client reminder is not available yet';
export function buildFleetReturnListNextSteps(
  input: FleetReturnListNextStepInput,
): FleetReturnNextStepPresentation[] {
  if (input.returnOnHold) {
    return [
      {
        actionKey: 'resolve_hold',
        label: 'Resolve hold',
        variant: 'primary',
        enabled: true,
      },
      {
        actionKey: 'view_inspection_result',
        label: 'View result',
        variant: 'secondary',
        enabled: true,
      },
    ];
  }

  if (input.vehicleStatus === 'return_pending') {
    const steps: FleetReturnNextStepPresentation[] = [];
    if (isReturnOverdue(input)) {
      steps.push({
        actionKey: 'remind_client',
        label: 'Remind client',
        variant: 'ghost',
        enabled: false,
        reasonDisabled: REMIND_DISABLED_REASON,
      });
    }
    steps.push({
      actionKey: 'receive',
      label: 'Receive',
      variant: 'secondary',
      enabled: !input.registeredReturn,
      ...(input.registeredReturn
        ? { reasonDisabled: 'Vehicle was already received at gate' }
        : {}),
    });
    return steps;
  }

  if (input.vehicleStatus === 'returned') {
    if (input.inspectionStatus === 'in_progress') {
      return [
        {
          actionKey: 'continue_inspection',
          label: 'Continue',
          variant: 'secondary',
          enabled: true,
        },
      ];
    }
    if (input.inspectionStatus === 'ready_to_finalize') {
      return [
        {
          actionKey: 'finalize_inspection',
          label: 'Finalize',
          variant: 'primary',
          enabled: true,
        },
      ];
    }
    if (input.inspectionStatus === 'not_started') {
      return [
        {
          actionKey: 'start_inspection',
          label: 'Start Inspection',
          variant: 'primary',
          enabled: true,
        },
      ];
    }
    if (input.inspectionStatus === 'completed') {
      return [
        {
          actionKey: 'view_inspection_result',
          label: 'View result',
          variant: 'primary',
          enabled: true,
        },
      ];
    }
  }

  if (input.vehicleStatus === 'workshop') {
    const jobId = input.workshopJobId?.trim() || null;
    const steps: FleetReturnNextStepPresentation[] = [];
    if (input.inspectionStatus === 'completed' && input.workshopRepairClosed) {
      steps.push({
        actionKey: 'reinspect',
        label: 'Re-inspect',
        variant: 'primary',
        enabled: true,
      });
      steps.push({
        actionKey: 'view_inspection_result',
        label: 'View result',
        variant: 'secondary',
        enabled: true,
      });
    } else if (input.inspectionStatus === 'completed') {
      steps.push({
        actionKey: 'view_inspection_result',
        label: 'View result',
        variant: 'primary',
        enabled: true,
      });
    }
    steps.push({
      actionKey: 'view_job',
      label: 'View job',
      variant: 'secondary',
      enabled: !!jobId,
      workshopJobId: jobId,
      ...(!jobId
        ? { reasonDisabled: 'No workshop job linked for this vehicle' }
        : {}),
    });
    return steps;
  }

  if (
    input.vehicleStatus === 'available' &&
    input.inspectionStatus === 'completed'
  ) {
    return [
      {
        actionKey: 'view_inspection_result',
        label: 'View result',
        variant: 'secondary',
        enabled: true,
      },
    ];
  }

  return [];
}
