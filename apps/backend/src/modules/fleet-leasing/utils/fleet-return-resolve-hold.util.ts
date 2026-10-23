import type { FleetReturnInspectionResultPresentation } from './fleet-return-inspection-result.util';

/**
 * Append a hold-cleared marker to the persisted result snapshot before reopening finalize.
 * The row is then cleared for re-finalize; this shape is used for audit metadata only.
 */
export function appendHoldResolvedToInspectionResult(
  stored: FleetReturnInspectionResultPresentation,
  resolvedAt: Date,
): FleetReturnInspectionResultPresentation {
  const detail = resolvedAt.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  });
  const timeline = [
    ...stored.timeline.filter((step) => step.key !== 'hold_resolved'),
    {
      key: 'hold_resolved',
      label: 'Hold resolved',
      detail: `${detail} · Ready to finalize again`,
      state: 'done' as const,
    },
  ];
  return {
    ...stored,
    statusBanner: null,
    timeline,
  };
}
