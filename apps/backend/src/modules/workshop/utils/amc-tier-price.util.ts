/** Display label stored on AMC tier rows (derived from paise on write). */
export function formatAmcTierPriceDisplayLabelFromPaise(
  pricePaise: number,
): string {
  const rupees = pricePaise / 100;
  return `₹${rupees.toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}
