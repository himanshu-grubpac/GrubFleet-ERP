import { toast } from "sonner";

const DEFAULT_SUCCESS_DURATION_MS = 4000;
const DEFAULT_ERROR_DURATION_MS = 6000;

export function showSuccessToast(message: string): void {
  toast.success(message, { duration: DEFAULT_SUCCESS_DURATION_MS });
}

export function showCopiedToClipboardToast(): void {
  showSuccessToast("Copied to clipboard");
}

export function showErrorToast(message: string): void {
  toast.error(message, { duration: DEFAULT_ERROR_DURATION_MS });
}

export function showEmployeeActivatedToast(fullName: string): void {
  showSuccessToast(`${fullName} was activated`);
}

export function showEmployeeDeactivatedToast(fullName: string): void {
  showSuccessToast(`${fullName} was deactivated`);
}

export const EMPLOYEE_STATUS_UPDATE_ERROR =
  "Could not update employee status. Try again.";

export const EMPLOYEE_SAVE_ERROR = "Could not save employee. Try again.";

export function showEmployeeCreatedToast(fullName: string): void {
  showSuccessToast(`${fullName} was added`);
}

export function showEmployeeUpdatedToast(fullName: string): void {
  showSuccessToast(`${fullName} was updated`);
}

export function showLocationCreatedToast(name: string): void {
  showSuccessToast(`${name} was added`);
}

export function showLocationUpdatedToast(name: string): void {
  showSuccessToast(`${name} was updated`);
}

export function showLocationActivatedToast(name: string): void {
  showSuccessToast(`${name} was activated`);
}

export function showLocationDeactivatedToast(name: string): void {
  showSuccessToast(`${name} was deactivated`);
}

export const LOCATION_SAVE_ERROR = "Could not save location. Try again.";
export const LOCATION_STATUS_UPDATE_ERROR =
  "Could not update location status. Try again.";

export function showSupplierCreatedToast(name: string): void {
  showSuccessToast(`${name} was added`);
}

export function showSupplierUpdatedToast(name: string): void {
  showSuccessToast(`${name} was updated`);
}

export function showSupplierActivatedToast(name: string): void {
  showSuccessToast(`${name} was activated`);
}

export function showSupplierDeactivatedToast(name: string): void {
  showSuccessToast(`${name} was deactivated`);
}

export function showSparePartCreatedToast(name: string): void {
  showSuccessToast(`${name} was added to stock register`);
}

export function showSparePartUpdatedToast(name: string): void {
  showSuccessToast(`${name} was updated`);
}

export function showSparePartActivatedToast(name: string): void {
  showSuccessToast(`${name} was activated`);
}

export function showSparePartDeactivatedToast(name: string): void {
  showSuccessToast(`${name} was deactivated`);
}

export function showStockReceiptCreatedToast(label: string): void {
  showSuccessToast(`Stock receipt ${label} was saved`);
}

export function showStockReceiptUpdatedToast(label: string): void {
  showSuccessToast(`Stock receipt ${label} was updated`);
}

export const SUPPLIER_SAVE_ERROR = "Could not save supplier. Try again.";
export const SUPPLIER_STATUS_UPDATE_ERROR =
  "Could not update supplier status. Try again.";

export function showDriverCreatedToast(name: string): void {
  showSuccessToast(`${name} was added to the register`);
}

export function showDriverUpdatedToast(name: string): void {
  showSuccessToast(`${name} was updated`);
}

export function showDriverActivatedToast(name: string): void {
  showSuccessToast(`${name} was activated`);
}

export function showDriverDeactivatedToast(name: string): void {
  showSuccessToast(`${name} was deactivated`);
}

export const DRIVER_SAVE_ERROR = "Could not save driver. Try again.";
export const DRIVER_STATUS_UPDATE_ERROR =
  "Could not update driver status. Try again.";

export function showClientCreatedToast(name: string): void {
  showSuccessToast(`${name} was added`);
}

export function showClientUpdatedToast(name: string): void {
  showSuccessToast(`${name} was updated`);
}

export function showClientActivatedToast(name: string): void {
  showSuccessToast(`${name} was activated`);
}

export function showClientDeactivatedToast(name: string): void {
  showSuccessToast(`${name} was deactivated`);
}

export const CLIENT_SAVE_ERROR = "Could not save client. Try again.";
export const CLIENT_STATUS_UPDATE_ERROR =
  "Could not update client status. Try again.";

export const LEASE_CONTRACT_SAVE_ERROR =
  "Could not save lease contract. Try again.";
export const LEASE_CONTRACT_STATUS_UPDATE_ERROR =
  "Could not update contract status. Try again.";
export const LEASE_CONTRACT_RENEW_ERROR =
  "Could not renew contract. Try again.";

export function showLeaseContractUpdatedToast(): void {
  showSuccessToast("Lease contract was updated");
}

export function showLeaseContractActivatedToast(): void {
  showSuccessToast("Contract activated.");
}

export function showLeaseContractDeactivatedToast(): void {
  showSuccessToast("Contract deactivated.");
}

export function showLeaseContractReactivatedToast(): void {
  showSuccessToast("Contract reactivated.");
}

export function showLeaseContractTerminationRequestedToast(): void {
  showSuccessToast("Termination requested.");
}

export function showLeaseContractTerminationApprovedToast(): void {
  showSuccessToast("Termination approved.");
}

export function showLeaseContractTerminatedToast(): void {
  showSuccessToast(
    "Contract terminated — security deposit settled. Contract is closed.",
  );
}

export function showLeaseContractBillingPausedToast(): void {
  showSuccessToast("Billing paused.");
}

export function showLeaseContractConfirmedToast(): void {
  showSuccessToast("Contract confirmed.");
}

export function showLeaseContractSubmittedAndApprovedToast(): void {
  showSuccessToast("Contract submitted and approved.");
}

export function showLeaseContractSubmittedForApprovalToast(): void {
  showSuccessToast("Contract submitted for approval.");
}

export function showLeaseContractSubmittedToast(): void {
  showSuccessToast("Contract submitted.");
}

export function showLeaseContractRenewedToast(): void {
  showSuccessToast("Contract renewed.");
}

export function showLeaseContractExtendedToast(): void {
  showSuccessToast("Contract extended.");
}

export const ASSET_CLASS_SAVE_ERROR = "Could not save asset class. Try again.";
export const ASSET_CLASS_STATUS_UPDATE_ERROR =
  "Could not update asset class status. Try again.";

export function showAssetClassCreatedToast(name: string): void {
  showSuccessToast(`${name} was added`);
}

export function showAssetClassUpdatedToast(name: string): void {
  showSuccessToast(`${name} was updated`);
}

export function showAssetClassActivatedToast(name: string): void {
  showSuccessToast(`${name} was activated`);
}

export function showAssetClassDeactivatedToast(name: string): void {
  showSuccessToast(`${name} was deactivated`);
}

export const ASSET_MASTER_SAVE_ERROR =
  "Could not save asset master. Try again.";
export const ASSET_MASTER_CREATE_ERROR =
  "Could not create asset master. Try again.";
export const ASSET_MASTER_STATUS_UPDATE_ERROR =
  "Could not update asset master status. Try again.";

export function showAssetMasterCreatedToast(): void {
  showSuccessToast("Asset master created");
}

export function showAssetMasterUpdatedToast(): void {
  showSuccessToast("Asset master updated");
}

export function showAssetMasterActivatedToast(): void {
  showSuccessToast("Asset master activated");
}

export function showAssetMasterDeactivatedToast(): void {
  showSuccessToast("Asset master deactivated");
}

export const FLEET_VEHICLE_SAVE_ERROR = "Could not update vehicle. Try again.";
export const FLEET_VEHICLE_ADD_ERROR = "Could not add vehicle. Try again.";
export const FLEET_VEHICLE_STATUS_UPDATE_ERROR =
  "Could not update vehicle status. Try again.";

export function showFleetVehicleAddedToast(): void {
  showSuccessToast("Vehicle added to fleet register");
}

export function showFleetVehicleUpdatedToast(): void {
  showSuccessToast("Fleet vehicle updated");
}

export function showFleetVehicleActivatedToast(): void {
  showSuccessToast("Fleet vehicle activated");
}

export function showFleetVehicleDeactivatedToast(): void {
  showSuccessToast("Fleet vehicle deactivated");
}

export const COMPLIANCE_RENEWAL_SAVE_ERROR =
  "Could not save renewal. Try again.";

export function showComplianceRenewalSavedToast(): void {
  showSuccessToast("Compliance renewal saved");
}

export const VEHICLE_ASSIGN_ERROR = "Could not assign vehicle. Try again.";

export function showVehicleAssignedToLeaseToast(): void {
  showSuccessToast("Vehicle assigned to lease contract");
}

export const COPY_TO_CLIPBOARD_ERROR = "Could not copy to clipboard.";

export function showCopyToClipboardErrorToast(): void {
  showErrorToast(COPY_TO_CLIPBOARD_ERROR);
}

export type MutationResultToastInput = {
  success: boolean;
  successMessage: string;
  errorMessage: string;
};

/** Optional uniform handler for mutation onSuccess/onError toast pairing. */
export function showMutationResultToast(input: MutationResultToastInput): void {
  if (input.success) {
    showSuccessToast(input.successMessage);
    return;
  }
  showErrorToast(input.errorMessage);
}

export function showFinanceInvoiceCreatedToast(invoiceNumber: string): void {
  showSuccessToast(`Invoice ${invoiceNumber} was created`);
}

export function showFinanceInvoiceCancelledToast(invoiceNumber: string): void {
  showSuccessToast(`Invoice ${invoiceNumber} was cancelled`);
}

export function showFinanceInvoiceRemovedToast(invoiceNumber: string): void {
  showSuccessToast(`Invoice ${invoiceNumber} was removed from the register`);
}

export function showFinanceInvoiceUpdatedToast(invoiceNumber: string): void {
  showSuccessToast(`Invoice ${invoiceNumber} was updated`);
}

export function showFinanceInvoicePaymentRecordedToast(
  invoiceNumber: string,
): void {
  showSuccessToast(`Payment recorded for ${invoiceNumber}`);
}

export function showFinanceClientStatementSendRecordedToast(
  clientName: string,
): void {
  showSuccessToast(
    `Statement for ${clientName} was recorded. Email delivery is not enabled yet.`,
  );
}

export const FINANCE_CLIENT_STATEMENT_SEND_ERROR =
  "Could not record statement send. Try again.";

export const FINANCE_INVOICE_SAVE_ERROR =
  "Could not save invoice. Try again.";
export const FINANCE_INVOICE_CANCEL_ERROR =
  "Could not cancel invoice. Try again.";
export const FINANCE_INVOICE_REMOVE_ERROR =
  "Could not remove invoice. Try again.";

export function showFinanceVendorPaymentRecordedToast(
  paymentNumber: string,
): void {
  showSuccessToast(`Vendor payment ${paymentNumber} was recorded`);
}

export function showFinanceVendorPaymentRemovedToast(
  paymentNumber: string,
): void {
  showSuccessToast(`Vendor payment ${paymentNumber} was removed`);
}

export const FINANCE_VENDOR_PAYMENT_SAVE_ERROR =
  "Could not record vendor payment. Try again.";
export const FINANCE_VENDOR_PAYMENT_REMOVE_ERROR =
  "Could not remove vendor payment. Try again.";
