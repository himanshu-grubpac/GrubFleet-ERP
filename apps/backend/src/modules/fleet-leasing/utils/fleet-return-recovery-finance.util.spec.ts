import { applyFinanceRecoveryToInspectionResult } from './fleet-return-recovery-finance.util';
import type { FleetReturnInspectionResultPresentation } from './fleet-return-inspection-result.util';

const baseResult = {
  outcome: 'ready_to_lease',
  generatedAt: '2026-10-31T12:00:00.000Z',
  jobCard: null,
  recoveryNote: {
    displayNumber: 'RN-2026-0052',
    status: 'waiting_for_finance' as const,
    lines: [{ label: 'Client damage', amountMinor: 1_000_00 }],
    totalMinor: 1_000_00,
    billedToClientName: 'Client A',
    contractFootnote: 'Contract LC-1 stays in Closing.',
  },
  timeline: [],
  metrics: {
    offLeaseDays: 0,
    repairCostMinor: 0,
    recoveryTotalMinor: 1_000_00,
  },
  statusBanner: null,
  contractClosingProgress: null,
  assignmentPoolBanner: null,
  availableActions: [],
} satisfies FleetReturnInspectionResultPresentation;

describe('applyFinanceRecoveryToInspectionResult', () => {
  it('replaces stub RN number with finance invoice metadata', () => {
    const updated = applyFinanceRecoveryToInspectionResult(baseResult, {
      invoiceId: '11111111-1111-4111-8111-111111111111',
      invoiceNumber: 'BINV-2026-0042',
      status: 'unpaid',
    });
    expect(updated.recoveryNote.displayNumber).toBe('BINV-2026-0042');
    expect(updated.recoveryNote.financeInvoiceId).toBe(
      '11111111-1111-4111-8111-111111111111',
    );
    expect(updated.recoveryNote.status).toBe('waiting_for_finance');
    expect(updated.recoveryNote.financeInvoiceStatus).toBe('unpaid');
  });
});
