import type { OrganisationLocationListItem } from "@/lib/api/organisation/locations";
import { formatPhoneForCopy } from "@/lib/format/phone-format";

function nonEmptyLines(lines: Array<string | null | undefined>): string {
  return lines
    .filter((line): line is string => Boolean(line?.trim()))
    .join("\n");
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
