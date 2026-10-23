import type { FinanceInvoiceStatus } from '../../finance/constants/invoice.constants';
import type { FleetReturnInspectionResultPresentation } from './fleet-return-inspection-result.util';

export type FleetReturnRecoveryNoteStatus =
  'none' | 'waiting_for_finance' | FinanceInvoiceStatus;

export function mapFinanceStatusToRecoveryNoteStatus(
  financeStatus: FinanceInvoiceStatus,
): FleetReturnRecoveryNoteStatus {
  if (financeStatus === 'unpaid') {
    return 'waiting_for_finance';
  }
  return financeStatus;
}

export function applyFinanceRecoveryToInspectionResult(
  result: FleetReturnInspectionResultPresentation,
  finance:
    | {
        invoiceId: string;
        invoiceNumber: string;
        status: FinanceInvoiceStatus;
      }
    | null
    | undefined,
): FleetReturnInspectionResultPresentation {
  if (!finance || result.recoveryNote.totalMinor <= 0) {
    return result;
  }
  const noteStatus = mapFinanceStatusToRecoveryNoteStatus(finance.status);
  return {
    ...result,
    recoveryNote: {
      ...result.recoveryNote,
      displayNumber: finance.invoiceNumber,
      status: noteStatus,
      financeInvoiceId: finance.invoiceId,
      financeInvoiceStatus: finance.status,
    },
  };
}
