import type {
  OrganisationLocationDetail,
  OrganisationLocationListItem,
} from "@/lib/api/organisation/locations";
import type { LeaseContractListItem } from "@/lib/api/lease-contracts";
import type { EmployeeRecord } from "@/components/modules/organization/employees/types";
import { EMPLOYMENT_TYPE_LABELS } from "@/components/modules/organization/employees/types";
import { formatStructuredAddressMultiline } from "@/lib/format/address-format";
import { formatPhoneForCopy } from "@/lib/format/phone-format";

function nonEmptyLines(lines: Array<string | null | undefined>): string {
  return lines.filter((line): line is string => Boolean(line?.trim())).join("\n");
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

export function formatLocationDetailCopyText(
  location: OrganisationLocationDetail,
): string {
  const addressBlock = formatStructuredAddressMultiline(location);

  return nonEmptyLines([
    `Location: ${location.name}`,
    `Type: ${location.type}`,
    addressBlock && addressBlock !== "—"
      ? `Address:\n${addressBlock}`
      : `Address: ${location.address}`,
    location.siteContactPhone
      ? `Office contact phone: ${formatPhoneForCopy(location.siteContactPhone)}`
      : null,
    location.siteContactEmail
      ? `Office contact email: ${location.siteContactEmail}`
      : null,
    location.responsiblePerson
      ? `Responsible person: ${location.responsiblePerson}`
      : null,
    location.responsiblePersonPhone
      ? `Responsible phone: ${formatPhoneForCopy(location.responsiblePersonPhone)}`
      : null,
    location.responsiblePersonEmail
      ? `Responsible email: ${location.responsiblePersonEmail}`
      : null,
    location.deputyName ? `Deputy: ${location.deputyName}` : null,
    location.deputyPhone
      ? `Deputy phone: ${formatPhoneForCopy(location.deputyPhone)}`
      : null,
    location.deputyEmail ? `Deputy email: ${location.deputyEmail}` : null,
    `Status: ${location.status === "active" ? "Active" : "Inactive"}`,
  ]);
}

export function formatLeaseContractRowCopyText(
  contract: LeaseContractListItem,
): string {
  return nonEmptyLines([
    `Contract no.: ${contract.contractNumber}`,
    `Company: ${contract.clientName}`,
    contract.assetClasses ? `Asset class: ${contract.assetClasses}` : null,
    contract.startDate ? `Start date: ${contract.startDate}` : null,
    contract.endDate ? `End date: ${contract.endDate}` : null,
    contract.termMonths != null
      ? `Term: ${contract.termMonths} months`
      : null,
    `Status: ${contract.status}`,
  ]);
}

export function formatEmployeeRowCopyText(employee: EmployeeRecord): string {
  return nonEmptyLines([
    `Name: ${employee.fullName}`,
    employee.designation ? `Designation: ${employee.designation}` : null,
    employee.department ? `Department: ${employee.department}` : null,
    employee.location ? `Location: ${employee.location}` : null,
    employee.phone ? `Phone: ${formatPhoneForCopy(employee.phone)}` : null,
    employee.email ? `Email: ${employee.email}` : null,
    employee.reportsToName ? `Reports to: ${employee.reportsToName}` : null,
    `Employment type: ${EMPLOYMENT_TYPE_LABELS[employee.employmentType]}`,
    employee.dateOfJoining
      ? `Date of joining: ${employee.dateOfJoining}`
      : null,
    `Status: ${employee.status === "active" ? "Active" : "Inactive"}`,
  ]);
}
