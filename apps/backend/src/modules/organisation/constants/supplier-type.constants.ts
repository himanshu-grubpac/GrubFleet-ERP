export const ORGANISATION_SUPPLIER_TYPES = [
  'bike',
  'driver',
  'spare_parts',
  'compliance',
] as const;

export type OrganisationSupplierType =
  (typeof ORGANISATION_SUPPLIER_TYPES)[number];

export const SUPPLIER_TYPE_LABELS: Record<OrganisationSupplierType, string> = {
  bike: 'Bike',
  driver: 'Driver',
  spare_parts: 'Spare parts',
  compliance: 'Compliance',
};

export function supplierTypeToLabel(type: OrganisationSupplierType): string {
  return SUPPLIER_TYPE_LABELS[type];
}

export function parseSupplierTypeFilter(
  value: string,
): OrganisationSupplierType | undefined {
  const normalized = value.trim().toLowerCase();
  const map: Record<string, OrganisationSupplierType> = {
    bike: 'bike',
    driver: 'driver',
    spareparts: 'spare_parts',
    spare_parts: 'spare_parts',
    compliance: 'compliance',
  };
  return map[normalized];
}
