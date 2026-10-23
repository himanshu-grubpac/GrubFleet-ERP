import type { RestrictedInputKind } from "@/lib/forms/restricted-input";

/**
 * Semantic ERP field kinds (rule 24 §4, TSV Manual / typed columns).
 * Use with {@link FIELD_KIND_TO_RESTRICTED_KIND} when wiring create/edit forms.
 *
 * Not every kind maps to RestrictedInput — pickers, date, checkbox, file stay on approved raw controls.
 */
export type ErpFieldKind =
  | "shortText"
  | "name"
  | "descriptionLong"
  | "slugCode"
  | "email"
  | "phoneSite"
  | "phonePerson"
  | "url"
  | "pincodeIn"
  | "postal"
  | "integer"
  | "decimal"
  | "moneyInr"
  | "percentage"
  | "quantity"
  | "date"
  | "datetime"
  | "boolean"
  | "enumDropdown"
  | "uuidReference"
  | "file";

/**
 * Maps typed production fields to RestrictedInput kinds for keystroke/paste enforcement.
 * **Postal:** use `getPostalRestrictedKindForCountry(country)` from `@/lib/geo/postal`.
 * **URL / slug:** extend `RestrictedInputKind` when dedicated sanitizers ship.
 */
export const FIELD_KIND_TO_RESTRICTED_KIND: Partial<
  Record<ErpFieldKind, RestrictedInputKind>
> = {
  shortText: "text",
  name: "name",
  descriptionLong: "text",
  slugCode: "text",
  email: "email",
  phoneSite: "phone",
  phonePerson: "phone",
  pincodeIn: "pincode",
  integer: "digits",
  decimal: "digits",
  moneyInr: "inrRupee",
  percentage: "digits",
  quantity: "digits",
};

/** HTML input types allowed without RestrictedInput on integrated module forms (rule 24 §3). */
export const APPROVED_RAW_INPUT_TYPES = new Set([
  "date",
  "checkbox",
  "radio",
  "hidden",
  "file",
]);
