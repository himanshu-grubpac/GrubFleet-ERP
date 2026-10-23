/**
 * Shared context banners and flow guards for vehicle return GET detail.
 */

export type FleetReturnContextBannerLevel = 'info' | 'warning';

export type FleetReturnContextBanner = {
  level: FleetReturnContextBannerLevel;
  message: string;
};

export type FleetReturnFlowGuards = {
  inspectWorksheetView: FleetReturnContextBanner | null;
  inspectResultView: FleetReturnContextBanner | null;
  reInspectView: FleetReturnContextBanner | null;
};

export type FleetReturnConditionAtGlance = 'looks_fine' | 'visible_damage';

export function formatFleetReturnExcessKmMessage(kmOver: number): string {
  const km = Math.max(0, Math.floor(kmOver));
  return `${km.toLocaleString('en-IN')} km over lease allowance — excess km may apply on recovery.`;
}

export function buildFleetReturnReceiveContextBanners(input: {
  receivedAt: Date | string | null;
  conditionAtGlance?: FleetReturnConditionAtGlance | null;
  odometerReading?: number | null;
  handoverOdometer: number | null;
  leaseKmAllowance: number | null;
}): FleetReturnContextBanner[] {
  if (input.receivedAt) {
    return [];
  }

  const banners: FleetReturnContextBanner[] = [];

  if (input.conditionAtGlance === 'visible_damage') {
    banners.push({
      level: 'warning',
      message:
        'Visible damage noted at gate — inspection will capture details on the worksheet.',
    });
  }

  const odometer = input.odometerReading;
  if (
    odometer != null &&
    Number.isFinite(odometer) &&
    input.handoverOdometer != null &&
    input.leaseKmAllowance != null
  ) {
    const kmDriven = odometer - input.handoverOdometer;
    const kmOver = kmDriven - input.leaseKmAllowance;
    if (kmOver > 0) {
      banners.push({
        level: 'warning',
        message: formatFleetReturnExcessKmMessage(kmOver),
      });
    }
  }

  return banners;
}

export function buildFleetReturnFlowGuards(input: {
  receivedAt: Date | string | null;
  registeredReturn: boolean;
  vehicleStatus: string;
  inspectionStatus: string;
  reInspectionStatus: string;
  reInspectionEligible: boolean;
  reInspectionReasonIneligible?: string;
}): FleetReturnFlowGuards {
  let inspectWorksheetView: FleetReturnContextBanner | null = null;
  if (!input.receivedAt) {
    inspectWorksheetView = {
      level: 'info',
      message:
        'Detailed inspection is available only after gate-in while the return is pending receive.',
    };
  } else if (!input.registeredReturn || input.vehicleStatus !== 'returned') {
    inspectWorksheetView = {
      level: 'info',
      message:
        'Detailed inspection is available only after gate-in while the vehicle is in received · to inspect status.',
    };
  } else if (input.inspectionStatus === 'completed') {
    inspectWorksheetView = {
      level: 'info',
      message: 'This inspection is already completed.',
    };
  }

  let inspectResultView: FleetReturnContextBanner | null = null;
  if (input.inspectionStatus !== 'completed') {
    inspectResultView = {
      level: 'info',
      message:
        'Complete the inspection checklist before viewing the outcome screen.',
    };
  }

  let reInspectView: FleetReturnContextBanner | null = null;
  if (input.reInspectionStatus === 'completed') {
    reInspectView = {
      level: 'info',
      message:
        'Re-inspection is already complete for this vehicle. Open the inspection result for the updated outcome.',
    };
  } else if (!input.reInspectionEligible) {
    reInspectView = {
      level: 'warning',
      message:
        input.reInspectionReasonIneligible?.trim() ||
        'Re-inspection is not available for this return yet.',
    };
  }

  return {
    inspectWorksheetView,
    inspectResultView,
    reInspectView,
  };
}

export function buildFleetReturnDetailPresentation(
  detail: {
    receivedAt: string | null;
    registeredReturn: boolean;
    vehicleStatus: string;
    inspectionStatus: string;
    handoverOdometer: number | null;
    leaseKmAllowance: number | null;
    vehicleOdometer: number;
    expectedReturn: {
      handoverOdometer: number | null;
      leaseKmAllowance: number | null;
    };
    reInspection: {
      status: string;
      eligible: boolean;
      reasonIneligible?: string;
    };
  },
  preview?: {
    previewOdometer?: number;
    previewConditionAtGlance?: FleetReturnConditionAtGlance;
  },
): {
  contextBanners: FleetReturnContextBanner[];
  flowGuards: FleetReturnFlowGuards;
} {
  const handoverOdometer =
    detail.handoverOdometer ?? detail.expectedReturn.handoverOdometer;
  const leaseKmAllowance =
    detail.leaseKmAllowance ?? detail.expectedReturn.leaseKmAllowance;
  const odometerReading =
    preview?.previewOdometer ?? detail.vehicleOdometer ?? null;

  const contextBanners = buildFleetReturnReceiveContextBanners({
    receivedAt: detail.receivedAt,
    conditionAtGlance: preview?.previewConditionAtGlance ?? null,
    odometerReading,
    handoverOdometer,
    leaseKmAllowance,
  });

  const flowGuards = buildFleetReturnFlowGuards({
    receivedAt: detail.receivedAt,
    registeredReturn: detail.registeredReturn,
    vehicleStatus: detail.vehicleStatus,
    inspectionStatus: detail.inspectionStatus,
    reInspectionStatus: detail.reInspection.status,
    reInspectionEligible: detail.reInspection.eligible,
    reInspectionReasonIneligible: detail.reInspection.reasonIneligible,
  });

  return { contextBanners, flowGuards };
}
