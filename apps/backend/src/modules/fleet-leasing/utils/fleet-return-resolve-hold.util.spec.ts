import { appendHoldResolvedToInspectionResult } from './fleet-return-resolve-hold.util';
import type { FleetReturnInspectionResultPresentation } from './fleet-return-inspection-result.util';

const baseResult: FleetReturnInspectionResultPresentation = {
  outcome: 'on_hold',
  generatedAt: '2026-10-31T12:00:00.000Z',
  jobCard: null,
  recoveryNote: {
    displayNumber: 'RN-2026-ABCD',
    status: 'none',
    lines: [],
    totalMinor: 0,
    billedToClientName: 'Client',
    contractFootnote: 'Contract LC-1',
  },
  timeline: [
    {
      key: 'inspected',
      label: 'Inspected',
      detail: 'Hold',
      state: 'done',
    },
  ],
  metrics: {
    offLeaseDays: 0,
    repairCostMinor: 0,
    recoveryTotalMinor: 0,
  },
  statusBanner: { level: 'info', message: 'On hold' },
  contractClosingProgress: null,
  assignmentPoolBanner: null,
  availableActions: [],
};

describe('appendHoldResolvedToInspectionResult', () => {
  it('appends hold_resolved timeline step and clears banner', () => {
    const resolvedAt = new Date('2026-11-01T09:30:00.000Z');
    const updated = appendHoldResolvedToInspectionResult(
      baseResult,
      resolvedAt,
    );
    expect(updated.statusBanner).toBeNull();
    expect(updated.timeline.some((s) => s.key === 'hold_resolved')).toBe(true);
  });
});
