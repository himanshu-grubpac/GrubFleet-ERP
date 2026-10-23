import type { InputHTMLAttributes, KeyboardEvent } from "react";

import { sanitizeRupeeInputValue } from "@/lib/format/money-format";

/**
 * Shared input sanitization aligned with organisation backend DTO @MaxLength values.
 * Use via `RestrictedInput` or `sanitizeRestrictedInputValue` in controlled handlers.
 *
 * New ERP forms should use `RestrictedInput` (or re-export from `@/components/ui/input`)
 * instead of raw `<input>` for typed fields so typing, paste, and maxLength stay consistent.
 */

export const ORG_INPUT_LIMITS = {
  locationName: 255,
  locationTypeName: 120,
  addressLine: 255,
  addressRegion: 120,
  pincode: 6,
  postalUs: 10,
  postalGeneric: 20,
  /** Matches backend @MaxLength(32) on phone fields (E.164 storage). */
  phone: 32,
  email: 320,
  employeeFullName: 255,
  designation: 255,
  department: 120,
} as const;

/** Organisation suppliers — mirrors backend CreateSupplierDto @MaxLength. */
export const ORGANISATION_SUPPLIER_INPUT_LIMITS = {
  name: 255,
  contactPerson: 255,
  agreementReference: 120,
  phone: ORG_INPUT_LIMITS.phone,
  email: ORG_INPUT_LIMITS.email,
  addressLine: ORG_INPUT_LIMITS.addressLine,
  addressRegion: ORG_INPUT_LIMITS.addressRegion,
  addressPincode: ORG_INPUT_LIMITS.postalGeneric,
  /** ListSuppliersQueryDto.search @MaxLength(120). */
  supplierListSearch: 120,
} as const;

/** Organisation locations — mirrors backend CreateLocationDto / list search. */
export const ORGANISATION_LOCATION_INPUT_LIMITS = {
  name: ORG_INPUT_LIMITS.locationName,
  locationTypeName: ORG_INPUT_LIMITS.locationTypeName,
  addressLine: ORG_INPUT_LIMITS.addressLine,
  addressRegion: ORG_INPUT_LIMITS.addressRegion,
  addressPostal: ORG_INPUT_LIMITS.postalGeneric,
  sitePhone: ORG_INPUT_LIMITS.phone,
  siteEmail: ORG_INPUT_LIMITS.email,
  /** ListLocationsQueryDto.search @MaxLength(120). */
  locationListSearch: 120,
} as const;

/** Organisation employees — mirrors backend CreateEmployeeDto @MaxLength. */
export const ORGANISATION_EMPLOYEE_INPUT_LIMITS = {
  fullName: ORG_INPUT_LIMITS.employeeFullName,
  designation: ORG_INPUT_LIMITS.designation,
  department: ORG_INPUT_LIMITS.department,
  phone: ORG_INPUT_LIMITS.phone,
  email: ORG_INPUT_LIMITS.email,
  /** ListEmployeesQueryDto.search @MaxLength(120). */
  employeeListSearch: 120,
} as const;

/** Organisation driver register — mirrors backend CreateDriverDto @MaxLength. */
export const DRIVER_INPUT_LIMITS = {
  name: ORG_INPUT_LIMITS.employeeFullName,
  cprNo: 20,
  phone: ORG_INPUT_LIMITS.phone,
  email: ORG_INPUT_LIMITS.email,
  licenseNumber: 64,
  addressLine: ORG_INPUT_LIMITS.addressLine,
  addressRegion: ORG_INPUT_LIMITS.addressRegion,
  addressPincode: ORG_INPUT_LIMITS.postalGeneric,
  vehicleCode: 64,
  assetClass: ORG_INPUT_LIMITS.locationName,
  activeLeaseId: 64,
  /** ListDriversQueryDto.search @MaxLength(120). */
  driverListSearch: 120,
} as const;

/** Organisation client register — mirrors CreateOrganisationClientDto limits. */
export const ORGANISATION_CLIENT_INPUT_LIMITS = {
  clientName: 255,
  pocName: 255,
  pocEmail: ORG_INPUT_LIMITS.email,
  pocPhone: ORG_INPUT_LIMITS.phone,
  addressLine: ORG_INPUT_LIMITS.addressLine,
  addressRegion: ORG_INPUT_LIMITS.addressRegion,
  addressPincode: ORG_INPUT_LIMITS.postalGeneric,
  /** ListOrganisationClientsQueryDto.search @MaxLength(120). */
  clientListSearch: 120,
} as const;

/** Fleet client register — mirrors backend CreateFleetClientDto @MaxLength. */
/** Inventory — mirrors backend inventory-field.constants. */
export const INVENTORY_INPUT_LIMITS = {
  /** ListInventoryQueryDto.search @MaxLength(120). */
  listSearch: 120,
  sparePartName: 255,
  sparePartBrand: 255,
  compatibleAssetClassLabel: 120,
  stockReceiptPurchaseInvoiceRef: 255,
  stockReceiptBatchLot: 120,
  stockReceiptNotes: 2000,
  /** INVENTORY_STOCK_RECEIPT_QUANTITY_RECEIVED_MAX (9_999_999). */
  stockReceiptQuantityMaxDigits: 7,
  reorderThresholdMaxDigits: 7,
  markupPercentMaxDigits: 3,
} as const;

/** Workshop labor job cards — mirrors backend workshop-field.constants. */
export const WORKSHOP_INPUT_LIMITS = {
  /** ListWorkOrdersQueryDto.search @MaxLength(120). */
  workOrderListSearch: 120,
  laborJobCardName: 255,
  laborJobCardDescription: 2000,
  /** ListLaborJobCardsQueryDto.search @MaxLength(120). */
  laborJobCardListSearch: 120,
  workOrderReportedBy: 255,
  workOrderIssueDescription: 2000,
  workOrderNotes: 2000,
  laborLineDescription: 255,
  /** Odometer km digits cap — same as ASSET_REGISTER_VEHICLE_INPUT_LIMITS.odometerMaxDigits (7). */
  workOrderOdometerMaxDigits: 7,
  amcTierName: 120,
  amcTierDescription: 2000,
  amcTierPriceLabel: 120,
  maintenanceScheduleName: 255,
  maintenanceScheduleDescription: 2000,
} as const;

/** Finance invoices — mirrors create/list DTO @MaxLength and quantity caps. */
export const FINANCE_INVOICE_INPUT_LIMITS = {
  /** ListInvoicesQueryDto.search @MaxLength(120). */
  invoiceListSearch: 120,
  /** CreateSaleInvoiceDto.buyerName @MaxLength(255). */
  saleBuyerName: 255,
  saleBuyerEmail: ORG_INPUT_LIMITS.email,
  /** Sale / billing / spare purchase notes @MaxLength(2000). */
  invoiceNotes: 2000,
  /** CreateBillingInvoiceDto.billingPeriod @MaxLength(120). */
  billingPeriod: 120,
  /** CreatePurchaseSparePartsInvoiceDto.batchLot @MaxLength(120). */
  batchLot: 120,
  /** RecordInvoicePaymentDto.paymentReference @MaxLength(120). */
  paymentReference: 120,
  /** Purchase line / spare quantity @Max(1_000_000). */
  purchaseQuantityMaxDigits: 7,
  /** CreatePurchaseVehicleInvoiceLineDto.vatPercent @Max(100). */
  purchaseVatPercentMaxDigits: 3,
} as const;

/** Finance client statements — mirrors ListClientStatementsQueryDto. */
export const FINANCE_CLIENT_STATEMENT_INPUT_LIMITS = {
  /** ListClientStatementsQueryDto.search @MaxLength(120). */
  clientStatementListSearch: 120,
} as const;

/** Finance vendor payments — mirrors list/create vendor payment DTOs. */
export const FINANCE_VENDOR_PAYMENT_INPUT_LIMITS = {
  /** ListVendorPaymentsQueryDto.search @MaxLength(120). */
  vendorPaymentListSearch: 120,
  /** CreateVendorPaymentDto.paymentReference @MaxLength(120). */
  paymentReference: 120,
} as const;

/** Administration roles — mirrors CreateRoleDto / UpdateRoleDto @MaxLength. */
export const ADMINISTRATION_ROLE_INPUT_LIMITS = {
  /** CreateRoleDto.name / UpdateRoleDto.name @MaxLength(120). */
  roleName: 120,
  /** CreateRoleDto.description / UpdateRoleDto.description @MaxLength(2000). */
  roleDescription: 2000,
  /** Client-side list filter (same cap as other dashboard list searches). */
  roleListSearch: 120,
  /** Module access matrix module filter (client-side). */
  moduleMatrixSearch: 120,
} as const;

/** Fleet register vehicle — mirrors CreateAssetRegisterVehicleDto / constants. */
export const ASSET_REGISTER_VEHICLE_INPUT_LIMITS = {
  registrationNumber: 32,
  chassisNumber: 64,
  specialNotes: 2000,
  modelYearDigits: 4,
  /** ASSET_REGISTER_VEHICLE_ODOMETER_MAX (9_999_999). */
  odometerMaxDigits: 7,
  /** ListAssetRegisterVehiclesQueryDto.search @MaxLength(120). */
  listSearch: 120,
} as const;

/** Asset assignment — bulk assign DTO + assignable lease contract list search. */
export const ASSET_REGISTER_ASSIGNMENT_INPUT_LIMITS = {
  /** ListAssignableLeaseContractsForVehicleQueryDto.search @MaxLength(64). */
  assignableContractSearch: 64,
  /** Same as vehicle list search (assignment dashboard + bulk vehicle step). */
  vehicleListSearch: ASSET_REGISTER_VEHICLE_INPUT_LIMITS.listSearch,
  /** BulkAssignAssetRegisterVehiclesDto.handoverLocation @MaxLength(255). */
  handoverLocation: 255,
  /** BulkAssignAssetRegisterVehiclesDto.notes @MaxLength(2000). */
  notes: 2000,
  /** Handover odometer — mirrors vehicle register odometer cap. */
  odometerAtHandoverMaxDigits:
    ASSET_REGISTER_VEHICLE_INPUT_LIMITS.odometerMaxDigits,
} as const;

/** Compliance renew form — UI reference fields + shared money/date with vehicle DTO. */
export const ASSET_REGISTER_COMPLIANCE_INPUT_LIMITS = {
  /** Product-only policy number (not persisted on renew API yet). */
  policyNumber: 128,
  /** Product-only registration reference (not persisted on renew API yet). */
  registrationReference: 128,
} as const;

export const ASSET_REGISTER_CLASS_INPUT_LIMITS = {
  brand: 255,
  modelName: 255,
  fuelType: 64,
  fuelSystem: 64,
  color: 128,
  colorCode: 32,
  mileageUnit: 32,
  description: 2000,
  intakeItem: 500,
  manufacturingYearDigits: 4,
  engineDisplacementCcMaxDigits: 5,
  /** Mirrors CreateAssetClassDto mileage / fuel tank @Max(99999999.99). */
  specDecimalMaxIntegerDigits: 8,
  /** Mirrors CreateAssetClassDto rated load @Max(999999999999.99). */
  ratedLoadMaxIntegerDigits: 12,
  specDecimalMaxFractionDigits: 2,
  /** ListAssetClassesQueryDto.search @MaxLength(120). */
  listSearch: 120,
} as const;

export const FLEET_CLIENT_INPUT_LIMITS = {
  companyName: 255,
  taxId: 32,
  pocName: 255,
  pocEmail: ORG_INPUT_LIMITS.email,
  pocPhone: ORG_INPUT_LIMITS.phone,
  /** ListFleetClientsQueryDto.search @MaxLength(120) */
  clientSearch: 120,
} as const;

/** Lease contract wizard + edit — mirrors fleet-leasing create/update DTOs. */
export const FLEET_LEASE_TERMS_INPUT_LIMITS = {
  termMonthsMaxDigits: 3,
  /** Major rupee digits — matches DECIMAL_MONEY_PATTERN integer part (@grubpac/validation). */
  moneyMaxDigits: 12,
  /** CreateLeaseContractDto additionalTerms / description @MaxLength(2000) */
  additionalTerms: 2000,
  description: 2000,
} as const;

/** LeaseContractAssetLineDto — assetClass @MaxLength(64); quantity @IsInt @Min(1). */
export const FLEET_LEASE_ASSET_LINE_INPUT_LIMITS = {
  assetClass: 64,
  committedQuantityMaxDigits: 6,
} as const;

/** Fleet Support vehicle replacement — mirrors LookupOnLeaseVehicleQueryDto + list client search. */
export const FLEET_SUPPORT_REPLACEMENT_INPUT_LIMITS = {
  vehicleIdentifier: 64,
  clientSearch: 120,
} as const;

/** Lease contract + renewals list — ListLeaseContractsQueryDto / ListRenewalsExtensionsQueryDto.search @MaxLength(120). */
export const FLEET_LEASE_CONTRACT_LIST_INPUT_LIMITS = {
  search: 120,
} as const;

/** ITU E.164 maximum significant digits (excludes leading +). */
export const ORG_PHONE_MAX_DIGITS = 15;

export type RestrictedInputKind =
  | "text"
  | "name"
  | "digits"
  | "pincode"
  | "postalUs"
  | "postalGeneric"
  | "phone"
  | "email"
  | "inrRupee";

export type SanitizeRestrictedInputOptions = {
  maxLength?: number;
};

const DEFAULT_MAX: Record<RestrictedInputKind, number | undefined> = {
  text: undefined,
  name: ORG_INPUT_LIMITS.employeeFullName,
  digits: undefined,
  pincode: ORG_INPUT_LIMITS.pincode,
  postalUs: ORG_INPUT_LIMITS.postalUs,
  postalGeneric: ORG_INPUT_LIMITS.postalGeneric,
  phone: ORG_INPUT_LIMITS.phone,
  email: ORG_INPUT_LIMITS.email,
  inrRupee: 24,
};

function truncate(value: string, maxLength?: number): string {
  if (maxLength === undefined || value.length <= maxLength) {
    return value;
  }
  return value.slice(0, maxLength);
}

/** Free text / address lines — trim leading whitespace while typing. */
export function sanitizeTextValue(
  value: string,
  maxLength?: number,
): string {
  const withoutLeading = value.replace(/^\s+/, "");
  return truncate(withoutLeading, maxLength);
}

/** Person or place names — same as text with default name max when used via kind. */
export function sanitizeNameValue(
  value: string,
  maxLength: number = ORG_INPUT_LIMITS.employeeFullName,
): string {
  return sanitizeTextValue(value, maxLength);
}

export function sanitizeDigitsValue(
  value: string,
  maxLength?: number,
): string {
  return truncate(value.replace(/\D/g, ""), maxLength);
}

const VEHICLE_REGISTRATION_ALLOWED = /[A-Za-z0-9 -]/;

/** Plate / registration — A–Z, 0–9, space, hyphen; uppercase; max 32. */
export function sanitizeVehicleRegistrationInput(value: string): string {
  let out = "";
  for (const char of value) {
    if (out.length >= ASSET_REGISTER_VEHICLE_INPUT_LIMITS.registrationNumber) {
      break;
    }
    if (VEHICLE_REGISTRATION_ALLOWED.test(char)) {
      out += char;
    }
  }
  return out.replace(/^\s+/, "").toUpperCase();
}

const CHASSIS_VIN_ALLOWED = /[A-Za-z0-9-]/;

/** Chassis / VIN — alphanumeric + hyphen; uppercase; max 64. */
export function sanitizeChassisVinInput(value: string): string {
  let out = "";
  for (const char of value) {
    if (out.length >= ASSET_REGISTER_VEHICLE_INPUT_LIMITS.chassisNumber) {
      break;
    }
    if (CHASSIS_VIN_ALLOWED.test(char)) {
      out += char.toUpperCase();
    }
  }
  return out;
}

/** Alias for numeric-only fields (digits, optional max length). */
export const restrictNumericInput = sanitizeDigitsValue;

/** Non-negative decimal text — digits with at most one `.` and bounded scale. */
export function sanitizeNonNegativeDecimalInput(
  value: string,
  options?: { maxIntegerDigits?: number; maxDecimalPlaces?: number },
): string {
  const maxIntegerDigits = options?.maxIntegerDigits ?? 12;
  const maxDecimalPlaces = options?.maxDecimalPlaces ?? 2;
  let out = "";
  let seenDot = false;
  let integerDigits = 0;
  let decimalDigits = 0;

  for (const char of value) {
    if (char >= "0" && char <= "9") {
      if (seenDot) {
        if (decimalDigits >= maxDecimalPlaces) {
          continue;
        }
        decimalDigits += 1;
      } else if (integerDigits >= maxIntegerDigits) {
        continue;
      } else {
        integerDigits += 1;
      }
      out += char;
    } else if (char === "." && !seenDot) {
      seenDot = true;
      out += char;
    }
  }

  return out;
}

export function sanitizePincodeValue(value: string): string {
  return sanitizeDigitsValue(value, ORG_INPUT_LIMITS.pincode);
}

/** US ZIP — up to 5 digits or ZIP+4 (12345-6789). */
export function sanitizePostalUsValue(value: string): string {
  let out = "";
  let digitCount = 0;
  for (const char of value) {
    if (char >= "0" && char <= "9") {
      if (digitCount >= 9) {
        continue;
      }
      out += char;
      digitCount += 1;
      continue;
    }
    if (char === "-" && digitCount === 5 && !out.includes("-")) {
      out += "-";
    }
  }
  return truncate(out, ORG_INPUT_LIMITS.postalUs);
}

const POSTAL_GENERIC_ALLOWED = /[A-Za-z0-9\s-]/;

export function sanitizePostalGenericValue(value: string): string {
  let out = "";
  for (const char of value) {
    if (out.length >= ORG_INPUT_LIMITS.postalGeneric) {
      break;
    }
    if (POSTAL_GENERIC_ALLOWED.test(char)) {
      out += char;
    }
  }
  return out;
}

export function countPhoneDigits(value: string): number {
  let count = 0;
  for (const char of value) {
    if (char >= "0" && char <= "9") {
      count += 1;
    }
  }
  return count;
}

/**
 * Significant phone characters only: optional leading + and up to 15 digits.
 * Display formatting (spaces) is applied afterward in `formatPhoneInputValue`.
 */
export function compactPhoneSignificant(
  value: string,
  maxDigits: number = ORG_PHONE_MAX_DIGITS,
): string {
  let out = "";
  let digitCount = 0;
  for (const char of value) {
    if (char >= "0" && char <= "9") {
      if (digitCount >= maxDigits) {
        continue;
      }
      out += char;
      digitCount += 1;
      continue;
    }
    if (char === "+" && out.length === 0) {
      out += char;
    }
  }
  return out;
}

export function sanitizePhoneValue(value: string): string {
  return compactPhoneSignificant(value);
}

const EMAIL_ALLOWED = /[a-zA-Z0-9._%+\-@]/;

/** Strip whitespace and characters invalid in typical email local/domain parts. */
export function sanitizeEmailValue(
  value: string,
  maxLength: number = ORG_INPUT_LIMITS.email,
): string {
  let out = "";
  for (const char of value) {
    if (out.length >= maxLength) {
      break;
    }
    if (EMAIL_ALLOWED.test(char)) {
      out += char;
    }
  }
  return out;
}

export function sanitizeRestrictedInputValue(
  kind: RestrictedInputKind,
  value: string,
  options: SanitizeRestrictedInputOptions = {},
): string {
  const maxLength = options.maxLength ?? DEFAULT_MAX[kind];

  switch (kind) {
    case "text":
      return sanitizeTextValue(value, maxLength);
    case "name":
      return sanitizeNameValue(
        value,
        maxLength ?? ORG_INPUT_LIMITS.employeeFullName,
      );
    case "digits":
      return sanitizeDigitsValue(value, maxLength);
    case "pincode":
      return sanitizePincodeValue(value);
    case "postalUs":
      return sanitizePostalUsValue(value);
    case "postalGeneric":
      return sanitizePostalGenericValue(value);
    case "phone":
      return sanitizePhoneValue(value);
    case "email":
      return sanitizeEmailValue(
        value,
        maxLength ?? ORG_INPUT_LIMITS.email,
      );
    case "inrRupee":
      return sanitizeRupeeInputValue(value);
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

const CONTROL_KEYS = new Set([
  "Backspace",
  "Delete",
  "Tab",
  "Escape",
  "Enter",
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
  "Home",
  "End",
]);

function isModifierCombo(event: KeyboardEvent): boolean {
  return event.ctrlKey || event.metaKey || event.altKey;
}

/** Block printable keys that would be stripped on the next change event. */
export type ShouldBlockRestrictedInputOptions = {
  maxLength?: number;
};

export function shouldBlockKeyForRestrictedInput(
  kind: RestrictedInputKind,
  event: KeyboardEvent<HTMLInputElement>,
  options: ShouldBlockRestrictedInputOptions = {},
): boolean {
  if (isModifierCombo(event) || CONTROL_KEYS.has(event.key)) {
    return false;
  }
  if (event.key.length !== 1) {
    return false;
  }

  const char = event.key;
  const input = event.currentTarget;
  const { selectionStart, selectionEnd, value } = input;
  const start = selectionStart ?? value.length;
  const end = selectionEnd ?? value.length;

  switch (kind) {
    case "digits":
    case "pincode":
      return !/^\d$/.test(char);
    case "postalUs": {
      if (/^\d$/.test(char)) {
        return false;
      }
      if (char === "-") {
        const digits = countPhoneDigits(value);
        return digits !== 5 || value.includes("-");
      }
      return true;
    }
    case "postalGeneric":
      return !POSTAL_GENERIC_ALLOWED.test(char);
    case "phone": {
      const displayMax =
        options.maxLength ?? ORG_INPUT_LIMITS.phone;
      const replacingSelection = start !== end;

      if (/^\d$/.test(char)) {
        if (!replacingSelection) {
          const digitsInField = countPhoneDigits(value);
          if (digitsInField >= ORG_PHONE_MAX_DIGITS) {
            return true;
          }
          if (
            start === end &&
            value.length >= displayMax
          ) {
            return true;
          }
        }
        return false;
      }
      if (char === "+" && start === 0 && end === 0 && !value.includes("+")) {
        return false;
      }
      if (
        (char === " " || char === "-" || char === "(" || char === ")") &&
        value.length > 0
      ) {
        return false;
      }
      return true;
    }
    case "email":
      return !EMAIL_ALLOWED.test(char);
    case "inrRupee": {
      if (/^\d$/.test(char)) {
        return false;
      }
      if (char === ".") {
        const withoutSelection =
          value.slice(0, start) + value.slice(end);
        return withoutSelection.includes(".");
      }
      return true;
    }
    case "text":
    case "name":
      return false;
    default:
      return false;
  }
}

export function restrictedInputHtmlProps(
  kind: RestrictedInputKind,
): Pick<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "inputMode" | "autoComplete" | "maxLength"
> {
  switch (kind) {
    case "pincode":
      return {
        type: "text",
        inputMode: "numeric",
        autoComplete: "postal-code",
        maxLength: ORG_INPUT_LIMITS.pincode,
      };
    case "postalUs":
      return {
        type: "text",
        inputMode: "numeric",
        autoComplete: "postal-code",
        maxLength: ORG_INPUT_LIMITS.postalUs,
      };
    case "postalGeneric":
      return {
        type: "text",
        autoComplete: "postal-code",
        maxLength: ORG_INPUT_LIMITS.postalGeneric,
      };
    case "digits":
      return { type: "text", inputMode: "numeric" };
    case "phone":
      return {
        type: "tel",
        inputMode: "tel",
        autoComplete: "tel",
        maxLength: ORG_INPUT_LIMITS.phone,
      };
    case "email":
      return {
        type: "email",
        inputMode: "email",
        autoComplete: "email",
        maxLength: ORG_INPUT_LIMITS.email,
      };
    case "name":
      return { type: "text", autoComplete: "name" };
    case "inrRupee":
      return { type: "text", inputMode: "decimal", autoComplete: "off" };
    case "text":
    default:
      return { type: "text" };
  }
}
