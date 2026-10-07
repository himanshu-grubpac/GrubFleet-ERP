import type { OrganisationLocationListItem } from "@/lib/api/organisation/locations";
import type { OrganisationEmployeeListItem } from "@/lib/api/organisation/employees";
import type { LeaseContractListItem } from "@/lib/api/lease-contracts";
import { formatPhoneForCopy } from "@/lib/format/phone-format";

function nonEmptyLines(lines: Array<string | null | undefined>): string {
  return lines
    .filter((line): line is string => Boolean(line?.trim()))
    .join("\n");
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
