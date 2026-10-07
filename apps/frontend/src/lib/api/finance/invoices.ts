import type { PaginatedResponse } from "@grubpac/shared-types";
import { apiFetch } from "../client";

export type FinanceInvoiceType = "purchase" | "sale" | "billing";
export type FinanceInvoiceStatus =
  | "unpaid"
  | "partially_paid"
  | "paid"
  | "cancelled";

export type FinanceInvoiceListItem = {
  id: string;
  invoiceNumber: string;
  invoiceType: FinanceInvoiceType;
  status: FinanceInvoiceStatus;
  partyName: string;
  description: string;
  totalAmountMinor: number;
  amountPaidMinor: number;
  balanceDueMinor: number;
  invoiceDate: string;
  availableActions: FinanceInvoiceAvailableActions;
};

export type FinanceInvoicePayment = {
  id: string;
  paymentNumber: string | null;
  amountMinor: number;
  paymentDate: string;
  paymentMethod: string | null;
  paymentReference: string | null;
  createdAt: string;
};

export type FinanceInvoiceAvailableActions = {
  edit: boolean;
  cancel: boolean;
  remove: boolean;
  recordPayment: boolean;
};

export type FinanceInvoiceReferencedByLink = {
  kind: "fleet_vehicle" | "stock_receipt";
  label: string;
  entityId: string | null;
};

export type FinanceInvoicePaymentSummary = {
  totalAmountMinor: number;
  amountPaidMinor: number;
  balanceDueMinor: number;
  readOnly: boolean;
  readOnlyMessage: string | null;
};

export type FinancePaymentMethodOption = {
  value: string;
  label: string;
};

export type FinanceInvoiceDetail = FinanceInvoiceListItem & {
  notes: string | null;
  supplierId: string | null;
  purchaseLineKind: "vehicle" | "spare_parts" | null;
  partyEmail: string | null;
  clientId: string | null;
  leaseContractId: string | null;
  leaseContractNumber: string | null;
  billingPeriod: string | null;
  cancelReason: string | null;
  vehicleId: string | null;
  vehicleLabel: string | null;
  payments: FinanceInvoicePayment[];
  paymentSummary: FinanceInvoicePaymentSummary;
  referencedBy: FinanceInvoiceReferencedByLink[];
  availableActions: FinanceInvoiceAvailableActions;
  lines: Array<{
    id: string;
    lineKind: string;
    assetClassName: string | null;
    inventoryPartId: string | null;
    inventoryPartName: string | null;
    vehicleId: string | null;
    quantity: number;
    unitCostMinor: number | null;
    lineAmountMinor: number;
    batchLot: string | null;
  }>;
  createdAt: string;
  updatedAt: string;
};

export type ListFinanceInvoicesParams = {
  organizationId: string;
  page?: number;
  pageSize?: number;
  search?: string;
  status?: FinanceInvoiceStatus;
  invoiceType?: FinanceInvoiceType;
};

function orgHeaders(organizationId: string, token: string) {
  return {
    token,
    headers: { "x-organization-id": organizationId },
  };
}

export async function fetchFinanceInvoicesApi(
  token: string,
  params: ListFinanceInvoicesParams,
): Promise<PaginatedResponse<FinanceInvoiceListItem>> {
  const q = new URLSearchParams();
  q.set("organizationId", params.organizationId);
  q.set("page", String(params.page ?? 1));
  q.set("pageSize", String(params.pageSize ?? 20));
  if (params.search?.trim()) q.set("search", params.search.trim());
  if (params.status) q.set("status", params.status);
  if (params.invoiceType) q.set("invoiceType", params.invoiceType);

  return apiFetch(`/finance/invoices?${q.toString()}`, {
    method: "GET",
    ...orgHeaders(params.organizationId, token),
  });
}

export async function fetchFinanceInvoiceDetailApi(
  token: string,
  organizationId: string,
  invoiceId: string,
): Promise<FinanceInvoiceDetail> {
  const q = new URLSearchParams({ organizationId });
  return apiFetch(`/finance/invoices/${invoiceId}?${q.toString()}`, {
    method: "GET",
    ...orgHeaders(organizationId, token),
  });
}

export type CreatePurchaseVehicleInvoicePayload = {
  organizationId: string;
  supplierId: string;
  assetClassName: string;
  totalAmountMinor: number;
  invoiceDate: string;
  notes?: string;
};

export async function createPurchaseVehicleInvoiceApi(
  token: string,
  organizationId: string,
  body: CreatePurchaseVehicleInvoicePayload,
): Promise<FinanceInvoiceDetail> {
  return apiFetch("/finance/invoices/purchase/vehicle", {
    method: "POST",
    body: JSON.stringify(body),
    ...orgHeaders(organizationId, token),
  });
}

export type CreatePurchaseSparePartsInvoicePayload = {
  organizationId: string;
  supplierId: string;
  inventoryPartId: string;
  quantity: number;
  unitCostMinor: number;
  invoiceDate: string;
  batchLot?: string;
  notes?: string;
};

export async function createPurchaseSparePartsInvoiceApi(
  token: string,
  organizationId: string,
  body: CreatePurchaseSparePartsInvoicePayload,
): Promise<FinanceInvoiceDetail> {
  return apiFetch("/finance/invoices/purchase/spare-parts", {
    method: "POST",
    body: JSON.stringify(body),
    ...orgHeaders(organizationId, token),
  });
}

export type CreateSaleInvoicePayload = {
  organizationId: string;
  vehicleId: string;
  buyerName: string;
  buyerEmail?: string;
  totalAmountMinor: number;
  invoiceDate: string;
  notes?: string;
  requestAutoEmail?: boolean;
};

export async function createSaleInvoiceApi(
  token: string,
  organizationId: string,
  body: CreateSaleInvoicePayload,
): Promise<FinanceInvoiceDetail> {
  return apiFetch("/finance/invoices/sale", {
    method: "POST",
    body: JSON.stringify(body),
    ...orgHeaders(organizationId, token),
  });
}

export type CreateBillingInvoicePayload = {
  organizationId: string;
  clientId: string;
  leaseContractId: string;
  billingPeriod: string;
  totalAmountMinor: number;
  invoiceDate: string;
  notes?: string;
};

export async function createBillingInvoiceApi(
  token: string,
  organizationId: string,
  body: CreateBillingInvoicePayload,
): Promise<FinanceInvoiceDetail> {
  return apiFetch("/finance/invoices/billing/lease", {
    method: "POST",
    body: JSON.stringify(body),
    ...orgHeaders(organizationId, token),
  });
}

export type UpdateFinanceInvoicePayload = {
  organizationId: string;
  partyName?: string;
  partyEmail?: string;
  totalAmountMinor?: number;
  invoiceDate?: string;
  notes?: string;
  billingPeriod?: string;
};

export async function updateFinanceInvoiceApi(
  token: string,
  organizationId: string,
  invoiceId: string,
  body: UpdateFinanceInvoicePayload,
): Promise<FinanceInvoiceDetail> {
  return apiFetch(`/finance/invoices/${invoiceId}`, {
    method: "PATCH",
    body: JSON.stringify(body),
    ...orgHeaders(organizationId, token),
  });
}

export type RecordFinanceInvoicePaymentPayload = {
  organizationId: string;
  amountMinor: number;
  paymentDate: string;
  paymentMethod?: string;
  paymentReference?: string;
};

export async function recordFinanceInvoicePaymentApi(
  token: string,
  organizationId: string,
  invoiceId: string,
  body: RecordFinanceInvoicePaymentPayload,
): Promise<FinanceInvoiceDetail> {
  return apiFetch(`/finance/invoices/${invoiceId}/payments`, {
    method: "POST",
    body: JSON.stringify(body),
    ...orgHeaders(organizationId, token),
  });
}

export async function cancelFinanceInvoiceApi(
  token: string,
  organizationId: string,
  invoiceId: string,
  reason?: string,
): Promise<FinanceInvoiceDetail> {
  return apiFetch(`/finance/invoices/${invoiceId}/cancel`, {
    method: "PATCH",
    body: JSON.stringify({ organizationId, reason }),
    ...orgHeaders(organizationId, token),
  });
}

export type RemoveFinanceInvoiceResult = {
  id: string;
  invoiceNumber: string;
  removed: true;
};

export async function removeFinancePurchaseInvoiceApi(
  token: string,
  organizationId: string,
  invoiceId: string,
): Promise<RemoveFinanceInvoiceResult> {
  const q = new URLSearchParams({ organizationId });
  return apiFetch(`/finance/invoices/${invoiceId}?${q.toString()}`, {
    method: "DELETE",
    ...orgHeaders(organizationId, token),
  });
}

export async function fetchFinancePaymentMethodCatalogApi(
  token: string,
  organizationId: string,
): Promise<FinancePaymentMethodOption[]> {
  const q = new URLSearchParams({ organizationId });
  return apiFetch(
    `/finance/invoices/payment-methods/catalog?${q.toString()}`,
    {
      method: "GET",
      ...orgHeaders(organizationId, token),
    },
  );
}
