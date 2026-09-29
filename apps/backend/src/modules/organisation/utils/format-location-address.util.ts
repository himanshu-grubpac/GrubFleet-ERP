type AddressParts = {
  addressLine1: string;
  addressLine2?: string | null;
  addressCity?: string | null;
  addressDistrict?: string | null;
  addressState?: string | null;
  addressPincode?: string | null;
};

export function formatLocationAddress(parts: AddressParts): string {
  return [
    parts.addressLine1,
    parts.addressLine2,
    parts.addressCity,
    parts.addressDistrict,
    parts.addressState,
    parts.addressPincode,
  ]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join(', ');
}
