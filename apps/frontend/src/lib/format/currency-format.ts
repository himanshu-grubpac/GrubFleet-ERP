/** INR amounts for lease/finance display (major units as stored in API). */
export function formatIndianRupee(
  value: number | null | undefined,
): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `Rs. ${value.toLocaleString("en-IN")}`;
}
