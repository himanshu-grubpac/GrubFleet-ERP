import type { OrganisationLocationListItem } from "@/lib/api/organisation/locations";
import type { OrganisationEmployeeListItem } from "@/lib/api/organisation/employees";
import type { LeaseContractListItem } from "@/lib/api/lease-contracts";
import { formatPhoneForCopy } from "@/lib/format/phone-format";

function nonEmptyLines(lines: Array<string | null | undefined>): string {
  return lines
    .filter((line): line is string => Boolean(line?.trim()))
    .join("\n");
}

/** Max visible characters for asset class name/code in list cells (full value on copy + tooltip). */
export const ASSET_CLASS_NAME_DISPLAY_MAX = 6;

/**
 * Asset class names are system-generated codes (e.g. `2026_activa_150_petrol_efi_bl`).
 * Display uses the first six characters of the trimmed string — not letter-only stripping,
 * so digits and underscores in the prefix remain visible.
 */
export function formatAssetClassNameForDisplay(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) {
    return "";
  }
  if (trimmed.length <= ASSET_CLASS_NAME_DISPLAY_MAX) {
    return trimmed;
  }
  return `${trimmed.slice(0, ASSET_CLASS_NAME_DISPLAY_MAX)}…`;
}

/** Visible hex length for compact UUID list cells (leading segment only). */
export const ENTITY_UUID_DISPLAY_HEX_MAX = 6;

/**
 * Short UUID for list cells — hyphen-free leading hex + ellipsis when longer.
 * Full canonical UUID stays on tooltip / copy. Not a first+last splice.
 */
export function formatEntityUuidForDisplay(id: string): string {
  const trimmed = id.trim();
  if (!trimmed) {
    return "";
  }
  const compact = trimmed.replace(/-/g, "").toLowerCase();
  if (compact.length <= ENTITY_UUID_DISPLAY_HEX_MAX) {
    return compact;
  }
  return `${compact.slice(0, ENTITY_UUID_DISPLAY_HEX_MAX)}…`;
}

export function formatEmployeeRowCopyText(
  employee: OrganisationEmployeeListItem,
): string {
  return nonEmptyLines([
    `Employee: ${employee.fullName}`,
    `Designation: ${employee.designation}`,
    `Department: ${employee.department}`,
    `Location: ${employee.location}`,
    employee.reportsToName
      ? `Reports to: ${employee.reportsToName}`
      : null,
    employee.email ? `Email: ${employee.email}` : null,
    employee.phone ? `Phone: ${formatPhoneForCopy(employee.phone)}` : null,
    `Status: ${employee.status === "active" ? "Active" : "Inactive"}`,
  ]);
}

export function formatLocationRowCopyText(
  location: OrganisationLocationListItem,
): string {
  return nonEmptyLines([
    `Location: ${location.name}`,
    `Type: ${location.type}`,
    `Address: ${location.address}`,
    location.responsiblePerson
      ? `Responsible person: ${location.responsiblePerson}`
      : null,
    location.email ? `Email: ${location.email}` : null,
    location.phone ? `Phone: ${formatPhoneForCopy(location.phone)}` : null,
    `Status: ${location.status === "active" ? "Active" : "Inactive"}`,
  ]);
}

/** Maps lease list status to org table action lifecycle (rule 31 — deactivated/closed = inactive). */
export function leaseContractRowActionStatus(
  status: string,
): "active" | "inactive" {
  const normalized = status.trim().toLowerCase();
  if (
    normalized === "deactivated" ||
    normalized === "closed" ||
    normalized === "concluded" ||
    normalized === "terminated"
  ) {
    return "inactive";
  }
  return "active";
}

export function formatLeaseContractRowCopyText(
  row: LeaseContractListItem,
): string {
  const start =
    row.startDate?.trim() ||
    null;
  return nonEmptyLines([
    `Contract: ${row.contractNumber}`,
    `Client: ${row.clientName}`,
    row.assetClasses?.trim()
      ? `Asset classes: ${row.assetClasses}`
      : null,
    start ? `Start date: ${start}` : null,
    row.endDate?.trim() ? `End date: ${row.endDate}` : null,
    row.termMonths != null ? `Term: ${row.termMonths} months` : null,
    `Status: ${row.status}`,
  ]);
}
