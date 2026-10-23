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

function detailHref(base: string): string {
  return shellPath(base, "detail");
}

function editHref(base: string): string {
  return shellPath(base, "edit");
}

export const organisationLocationDetailHref = (id: string) => {
  void id;
  return detailHref(MODULE_BASE.locations);
};

export const organisationLocationEditHref = (id: string) => {
  void id;
  return editHref(MODULE_BASE.locations);
};

export const organisationSupplierDetailHref = (id: string) => {
  void id;
  return detailHref(MODULE_BASE.suppliers);
};

export const organisationSupplierEditHref = (id: string) => {
  void id;
  return editHref(MODULE_BASE.suppliers);
};

export const organisationEmployeeDetailHref = (id: string) => {
  void id;
  return detailHref(MODULE_BASE.employees);
};

export const organisationEmployeeEditHref = (id: string) => {
  void id;
  return editHref(MODULE_BASE.employees);
};

export const organisationClientDetailHref = (id: string) => {
  void id;
  return detailHref(MODULE_BASE.clients);
};

export const organisationClientEditHref = (id: string) => {
  void id;
  return editHref(MODULE_BASE.clients);
};

export const organisationDriverDetailHref = (id: string) => {
  void id;
  return detailHref(MODULE_BASE.drivers);
};

export const organisationDriverEditHref = (id: string) => {
  void id;
  return editHref(MODULE_BASE.drivers);
};
