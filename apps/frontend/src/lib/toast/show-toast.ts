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

export const SUPPLIER_SAVE_ERROR = "Could not save supplier. Try again.";
export const SUPPLIER_STATUS_UPDATE_ERROR =
  "Could not update supplier status. Try again.";

export function showDriverActivatedToast(name: string): void {
  showSuccessToast(`${name} was activated`);
}

export function showDriverDeactivatedToast(name: string): void {
  showSuccessToast(`${name} was deactivated`);
}

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
