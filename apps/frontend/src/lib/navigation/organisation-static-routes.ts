/**
 * Static export (S3 + CloudFront): one HTML shell per view/edit; runtime id in query string.
 * @see docs/deployment/s3-cloudfront-portal.md
 */

export type OrganisationEntityQueryKey =
  | "locationId"
  | "supplierId"
  | "employeeId"
  | "clientId"
  | "driverId";

const MODULE_BASE = {
  locations: "/organization/locations",
  suppliers: "/organization/suppliers",
  employees: "/organization/employees",
  clients: "/organization/clients",
  drivers: "/organization/driver-register",
} as const;

function detailHref(
  base: string,
  queryKey: OrganisationEntityQueryKey,
  id: string,
): string {
  const trimmed = id.trim();
  if (!trimmed) {
    return `${base}/detail/`;
  }
  return `${base}/detail/?${queryKey}=${encodeURIComponent(trimmed)}`;
}

function editHref(
  base: string,
  queryKey: OrganisationEntityQueryKey,
  id: string,
): string {
  const trimmed = id.trim();
  if (!trimmed) {
    return `${base}/edit/`;
  }
  return `${base}/edit/?${queryKey}=${encodeURIComponent(trimmed)}`;
}

export const organisationLocationDetailHref = (id: string) =>
  detailHref(MODULE_BASE.locations, "locationId", id);

export const organisationLocationEditHref = (id: string) =>
  editHref(MODULE_BASE.locations, "locationId", id);

export const organisationSupplierDetailHref = (id: string) =>
  detailHref(MODULE_BASE.suppliers, "supplierId", id);

export const organisationSupplierEditHref = (id: string) =>
  editHref(MODULE_BASE.suppliers, "supplierId", id);

export const organisationEmployeeDetailHref = (id: string) =>
  detailHref(MODULE_BASE.employees, "employeeId", id);

export const organisationEmployeeEditHref = (id: string) =>
  editHref(MODULE_BASE.employees, "employeeId", id);

export const organisationClientDetailHref = (id: string) =>
  detailHref(MODULE_BASE.clients, "clientId", id);

export const organisationClientEditHref = (id: string) =>
  editHref(MODULE_BASE.clients, "clientId", id);

export const organisationDriverDetailHref = (id: string) =>
  detailHref(MODULE_BASE.drivers, "driverId", id);

export const organisationDriverEditHref = (id: string) =>
  editHref(MODULE_BASE.drivers, "driverId", id);
