/**
 * Static export (S3 + CloudFront): path-only detail/edit shells; entity id in secure nav store.
 * @see docs/deployment/s3-cloudfront-portal.md
 * @see lib/navigation/secure-entity-navigation.ts
 */

export type OrganisationEntityQueryKey =
  | "locationId"
  | "supplierId"
  | "employeeId"
  | "clientId"
  | "driverId";

const MODULE_BASE = {
  locations: "/organisation/locations",
  suppliers: "/organisation/suppliers",
  employees: "/organisation/employees",
  clients: "/organisation/clients",
  drivers: "/organisation/driver-register",
} as const;

function shellPath(base: string, segment: "detail" | "edit"): string {
  return `${base}/${segment}/`;
}

/** @param _id Entity id — use with navigateToEntityShell / prepareEntityNavigationForPath before navigation. */
function detailHref(
  base: string,
  _queryKey: OrganisationEntityQueryKey,
  _id: string,
): string {
  return shellPath(base, "detail");
}

function editHref(
  base: string,
  _queryKey: OrganisationEntityQueryKey,
  _id: string,
): string {
  return shellPath(base, "edit");
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
