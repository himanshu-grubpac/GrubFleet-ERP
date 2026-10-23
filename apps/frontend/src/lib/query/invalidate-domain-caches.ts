import type { QueryClient, QueryKey } from "@tanstack/react-query";

import { invalidateLeaseContractCaches } from "./invalidate-lease-contract-caches";

/**
 * Prefix invalidation for live cross-module sync.
 * TanStack Query matches every cached key that starts with the given prefix,
 * so list, detail, and catalog variants refresh together.
 */
async function invalidateQueryKeys(
  queryClient: QueryClient,
  queryKeys: readonly QueryKey[],
): Promise<void> {
  await Promise.all(
    queryKeys.map((queryKey) => queryClient.invalidateQueries({ queryKey })),
  );
}

/** Locations list, singular view, employee-form catalog, and stock-receipt British catalog key. */
export function invalidateLocationCaches(
  queryClient: QueryClient,
): Promise<void> {
  return invalidateQueryKeys(queryClient, [
    ["organization", "locations"],
    ["organization", "location"],
    ["organization", "location-types"],
    ["organisation", "locations", "catalog"],
  ]);
}

export function invalidateEmployeeCaches(
  queryClient: QueryClient,
): Promise<void> {
  return invalidateQueryKeys(queryClient, [
    ["organization", "employees"],
    ["organization", "employee"],
    ["workshop", "technicians-all"],
  ]);
}

export function invalidateClientCaches(
  queryClient: QueryClient,
): Promise<void> {
  return invalidateQueryKeys(queryClient, [
    ["organization", "clients"],
    ["organization", "client"],
    ["fleet-leasing-clients"],
    ["fleet-support-clients"],
    ["finance-billing-clients"],
    ["finance-billing-client-detail"],
    ["asset-register", "bulk-assign-catalog"],
  ]);
}

export function invalidateSupplierCaches(
  queryClient: QueryClient,
): Promise<void> {
  return invalidateQueryKeys(queryClient, [
    ["organization", "suppliers"],
    ["organization", "supplier"],
    ["finance-invoice-suppliers"],
  ]);
}

export function invalidateDriverCaches(
  queryClient: QueryClient,
): Promise<void> {
  return invalidateQueryKeys(queryClient, [
    ["organization", "drivers"],
  ]);
}

/** Asset class list, singular detail, active list, and every downstream catalog. */
export function invalidateAssetClassCaches(
  queryClient: QueryClient,
): Promise<void> {
  return invalidateQueryKeys(queryClient, [
    ["asset-register", "asset-classes"],
    ["asset-register", "asset-class"],
    ["inventory", "stock-register", "asset-classes"],
    ["workshop", "schedule-asset-classes"],
    ["finance-invoice-asset-classes"],
    ["fleet-leasing-asset-classes"],
  ]);
}

export function invalidateVehicleCaches(
  queryClient: QueryClient,
): Promise<void> {
  return invalidateQueryKeys(queryClient, [
    ["asset-register", "vehicles"],
    ["asset-register", "wizard-vehicles"],
    ["asset-register", "compliance"],
    ["workshop", "create-work-order-vehicles"],
    ["workshop", "amc-subscribe-vehicles"],
    ["finance-sale-vehicles"],
    ["replacement-candidates"],
  ]);
}

export function invalidateStockReceiptCaches(
  queryClient: QueryClient,
): Promise<void> {
  return invalidateQueryKeys(queryClient, [
    ["inventory", "stock-receipts"],
    ["inventory", "stock-balance"],
    ["inventory", "stock-register"],
    ["workshop", "inventory-parts-picker"],
    ["workshop", "labor-job-card-parts"],
  ]);
}

export function invalidateSparePartCaches(
  queryClient: QueryClient,
): Promise<void> {
  return invalidateQueryKeys(queryClient, [
    ["inventory", "stock-register"],
    ["inventory", "stock-balance"],
    ["finance-invoice-parts"],
    ["workshop", "inventory-parts-picker"],
    ["workshop", "labor-job-card-parts"],
  ]);
}

export function invalidateWorkOrderCaches(
  queryClient: QueryClient,
): Promise<void> {
  return invalidateQueryKeys(queryClient, [
    ["workshop", "work-orders"],
    ["workshop", "work-order"],
    ["workshop", "work-order-edit"],
    ["inventory", "parts-requests"],
    ["inventory", "stock-balance"],
  ]);
}

export function invalidateLaborJobCardCaches(
  queryClient: QueryClient,
): Promise<void> {
  return invalidateQueryKeys(queryClient, [
    ["workshop", "labor-job-cards"],
    ["workshop", "labor-job-card"],
    ["workshop", "labor-job-card-detail"],
    ["workshop", "labor-job-card-edit"],
    ["workshop", "create-work-order-job-cards"],
  ]);
}

export function invalidateAmcScheduleCaches(
  queryClient: QueryClient,
): Promise<void> {
  return invalidateQueryKeys(queryClient, [
    ["workshop", "amc-schedules"],
    ["workshop", "amc-schedule"],
    ["workshop", "amc-schedule-vehicles"],
    ["workshop", "amc-subscriber"],
  ]);
}

export function invalidateAmcTierCaches(
  queryClient: QueryClient,
): Promise<void> {
  return invalidateQueryKeys(queryClient, [
    ["workshop", "amc-tiers"],
    ["workshop", "amc-tier"],
    ["workshop", "amc-tier-subscribers"],
    ["workshop", "amc-subscribe-vehicles"],
  ]);
}

export function invalidateFinanceInvoiceCaches(
  queryClient: QueryClient,
): Promise<void> {
  return invalidateQueryKeys(queryClient, [
    ["finance-invoices"],
    ["finance-invoice-detail"],
    ["finance-invoice-edit-sale"],
    ["finance-invoice-edit-billing"],
    ["finance", "invoices", "purchase-catalog"],
    ["finance-vendor-payment-invoice-catalog"],
    ["finance-client-statements"],
    ["finance-client-statement-detail"],
    ["finance-vendor-payments"],
    ["finance-vendor-payment-detail"],
  ]);
}

/** Client and vendor payments also refresh statements and the vendor invoice picker. */
export function invalidateFinancePaymentCaches(
  queryClient: QueryClient,
): Promise<void> {
  return invalidateFinanceInvoiceCaches(queryClient);
}

/**
 * Lease list, both detail key orders, assignable contracts, billing contracts, and statements.
 * Prefix `lease-contract` matches the detail reader `['lease-contract', leaseId, organizationId]`.
 */
export async function invalidateLeaseDomainCaches(
  queryClient: QueryClient,
  organizationId: string | null | undefined,
  contractId?: string | null,
): Promise<void> {
  await invalidateLeaseContractCaches(queryClient, organizationId, contractId);
  await invalidateQueryKeys(queryClient, [
    ["lease-contract"],
    ["lease-contract-detail"],
    ["lease-contract-review"],
    ["lease-contract-confirmation"],
    ["lease-contract-change-history"],
    ["finance-billing-contracts"],
    ["finance-client-statements"],
    ["finance-client-statement-detail"],
    ["asset-register", "assignable-lease-contracts"],
  ]);
}

export function invalidateRoleCaches(
  queryClient: QueryClient,
): Promise<void> {
  return invalidateQueryKeys(queryClient, [
    ["roles"],
    ["role"],
    ["role-matrix"],
  ]);
}
