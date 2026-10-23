/** Figma inspection result decision — disposition + draft shape. */

export const FLEET_RETURN_INSPECTION_DISPOSITIONS = [
  'ready_to_lease',
  'send_to_workshop',
  'on_hold',
  'retire',
] as const;

export type FleetReturnInspectionDisposition =
  (typeof FLEET_RETURN_INSPECTION_DISPOSITIONS)[number];

export const FLEET_RETURN_WORKSHOP_PRIORITIES = [
  'normal',
  'high',
  'urgent',
] as const;

export type FleetReturnWorkshopPriority =
  (typeof FLEET_RETURN_WORKSHOP_PRIORITIES)[number];

export type FleetReturnInspectionIssueChargeKey = string;

export type FleetReturnInspectionFinalizeDraft = {
  disposition: FleetReturnInspectionDisposition | null;
  issueCharges: Record<FleetReturnInspectionIssueChargeKey, boolean>;
  waiveAllRecovery: boolean;
  inspectorConfirmed: boolean;
  wearAndTearNote?: string;
  workshopPriority?: FleetReturnWorkshopPriority;
  workshopTargetDate?: string;
};

export function issueChargeKey(
  sectionId: string,
  itemKey: string,
): FleetReturnInspectionIssueChargeKey {
  return `${sectionId}:${itemKey}`;
}

export function defaultIssueChargeForAttribution(
  attribution: string | undefined,
): boolean {
  if (attribution === 'client_damage' || attribution === 'missing') {
    return true;
  }
  return false;
}

export function emptyFinalizeDraft(): FleetReturnInspectionFinalizeDraft {
  return {
    disposition: null,
    issueCharges: {},
    waiveAllRecovery: false,
    inspectorConfirmed: false,
  };
}
