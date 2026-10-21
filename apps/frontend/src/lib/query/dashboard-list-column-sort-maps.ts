import type { DashboardColumnSortByMap } from "@/lib/query/dashboard-table-list-sort";

/** Organisation → Locations (`organisation-list-sort.constants.ts`) */
export const ORGANISATION_LOCATION_COLUMN_SORT: DashboardColumnSortByMap = {
  name: "name",
};

/** Organisation → Employees */
export const ORGANISATION_EMPLOYEE_COLUMN_SORT: DashboardColumnSortByMap = {
  name: "fullName",
  department: "department",
};

/** Organisation → Suppliers */
export const ORGANISATION_SUPPLIER_COLUMN_SORT: DashboardColumnSortByMap = {
  name: "name",
  type: "supplierType",
};

/** Organisation → Clients */
export const ORGANISATION_CLIENT_COLUMN_SORT: DashboardColumnSortByMap = {
  clientName: "name",
};

/** Organisation → Driver register */
export const ORGANISATION_DRIVER_COLUMN_SORT: DashboardColumnSortByMap = {
  name: "name",
};

/** Asset register → Asset classes */
export const ASSET_CLASS_COLUMN_SORT: DashboardColumnSortByMap = {
  classId: "classId",
  name: "name",
};

/** Asset register → Fleet / vehicles */
export const ASSET_REGISTER_VEHICLE_COLUMN_SORT: DashboardColumnSortByMap = {
  fleetCode: "fleetCode",
  registrationNumber: "registrationNumber",
  status: "operationalStatus",
};

/** Fleet leasing → Lease contracts & renewals (shared list shape) */
export const LEASE_CONTRACT_COLUMN_SORT: DashboardColumnSortByMap = {
  contractNumber: "contractNumber",
  startDate: "startDate",
  endDate: "endDate",
  status: "status",
};

/** Finance → Invoices */
export const FINANCE_INVOICE_COLUMN_SORT: DashboardColumnSortByMap = {
  invoiceNumber: "invoiceNumber",
  date: "invoiceDate",
  status: "status",
};

/** Finance → Vendor payments */
export const FINANCE_VENDOR_PAYMENT_COLUMN_SORT: DashboardColumnSortByMap = {
  paymentNumber: "paymentNumber",
  paymentDate: "paymentDate",
};

/** Finance → Client statements */
export const FINANCE_CLIENT_STATEMENT_COLUMN_SORT: DashboardColumnSortByMap = {
  clientName: "clientName",
  periodStart: "periodStart",
};

/** Inventory → Stock register (spare parts) */
export const INVENTORY_SPARE_PART_COLUMN_SORT: DashboardColumnSortByMap = {
  partName: "name",
  partNumber: "sku",
};

/** Inventory → Stock balance */
export const INVENTORY_STOCK_BALANCE_COLUMN_SORT: DashboardColumnSortByMap = {
  part: "name",
  partNumber: "sku",
};

/** Asset register → Compliance & renewals */
export const ASSET_REGISTER_COMPLIANCE_COLUMN_SORT: DashboardColumnSortByMap = {
  fleetCode: "fleetCode",
};

/** Inventory → Parts requests */
export const INVENTORY_PARTS_REQUEST_COLUMN_SORT: DashboardColumnSortByMap = {
  date: "requestedAt",
  status: "status",
};

/** Inventory → Stock receipts */
export const INVENTORY_STOCK_RECEIPT_COLUMN_SORT: DashboardColumnSortByMap = {
  date: "createdAt",
};

/** Workshop → Work orders */
export const WORKSHOP_WORK_ORDER_COLUMN_SORT: DashboardColumnSortByMap = {
  workOrderNumber: "workOrderNumber",
  status: "status",
};

/** Workshop → Labor job cards */
export const WORKSHOP_LABOR_JOB_CARD_COLUMN_SORT: DashboardColumnSortByMap = {
  name: "jobCardNumber",
  status: "status",
};
