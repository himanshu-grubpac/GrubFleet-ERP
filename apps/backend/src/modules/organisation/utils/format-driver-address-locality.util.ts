type LocalityParts = {
  addressCity?: string | null;
  addressDistrict?: string | null;
  addressCountry: string;
};

export function formatDriverAddressLocality(parts: LocalityParts): string {
  const locality = (parts.addressDistrict ?? parts.addressCity ?? '').trim();
  const country = parts.addressCountry.trim().toUpperCase();
  if (!locality) {
    return country === 'IN' ? 'India' : country;
  }
  if (country === 'BH') {
    return `${locality}, Bahrain`;
  }
  if (country === 'IN') {
    return locality;
  }
  return `${locality}, ${country}`;
}
