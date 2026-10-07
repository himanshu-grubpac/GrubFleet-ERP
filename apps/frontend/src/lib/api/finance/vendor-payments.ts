import type { PaginatedResponse } from "@grubpac/shared-types";
import { apiFetch } from "../client";

export type VendorPaymentListItem = {
  id: string;
  paymentNumber: string;
  paymentDate: string;
  purchaseInvoiceId: string;
  purchaseInvoiceNumber: string;
  vendorName: string;
  amountMinor: number;
  paymentMethod: string | null;
  paymentMethodLabel: string | null;
  paymentReference: string | null;
  availableActions: {
    remove: boolean;
  };
};

export type VendorPaymentDetail = VendorPaymentListItem & {
  purchaseInvoice: {
    id: string;
    invoiceNumber: string;
    vendorName: string;
    totalAmountMinor: number;
    amountPaidMinor: number;
    balanceDueMinor: number;
    status: string;
  };
  createdAt: string;
};

export type VendorPaymentPurchaseInvoiceOption = {
  id: string;
  invoiceNumber: string;
  vendorName: string;
  invoiceDate: string;
  status: string;
  totalAmountMinor: number;
  amountPaidMinor: number;
  balanceDueMinor: number;
};

export type ListVendorPaymentsParams = {
  organizationId: string;
  page?: number;
  pageSize?: number;
  search?: string;
};

function orgHeaders(organizationId: string, token: string) {
  return {
    token,
    headers: { "x-organization-id": organizationId },
  };
}

function toMinorUnits(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function normalizeVendorPaymentListItem(
  raw: VendorPaymentListItem,
): VendorPaymentListItem {
  return {
    ...raw,
    amountMinor: toMinorUnits(raw.amountMinor),
  };
}

function normalizePurchaseInvoiceOption(
  raw: VendorPaymentPurchaseInvoiceOption,
): VendorPaymentPurchaseInvoiceOption {
  return {
    ...raw,
    totalAmountMinor: toMinorUnits(raw.totalAmountMinor),
    amountPaidMinor: toMinorUnits(raw.amountPaidMinor),
    balanceDueMinor: toMinorUnits(raw.balanceDueMinor),
  };
}

export async function fetchVendorPaymentsApi(
  token: string,
  params: ListVendorPaymentsParams,
): Promise<PaginatedResponse<VendorPaymentListItem>> {
  const query = new URLSearchParams({
    organizationId: params.organizationId,
    page: String(params.page ?? 1),
    pageSize: String(params.pageSize ?? 10),
  });
  if (params.search?.trim()) {
    query.set("search", params.search.trim());
  }
  const res = await apiFetch<PaginatedResponse<VendorPaymentListItem>>(
    `/finance/vendor-payments?${query.toString()}`,
    {
      method: "GET",
      ...orgHeaders(params.organizationId, token),
    },
  );
  return {
    ...res,
    items: (res.items ?? []).map(normalizeVendorPaymentListItem),
  };
}

export async function fetchVendorPaymentDetailApi(
  token: string,
  organizationId: string,
  paymentId: string,
): Promise<VendorPaymentDetail> {
  const query = new URLSearchParams({ organizationId });
  const raw = await apiFetch<VendorPaymentDetail>(
    `/finance/vendor-payments/${encodeURIComponent(paymentId)}?${query.toString()}`,
    { method: "GET", ...orgHeaders(organizationId, token) },
  );
  return {
    ...raw,
    ...normalizeVendorPaymentListItem(raw),
    purchaseInvoice: {
      ...raw.purchaseInvoice,
      totalAmountMinor: toMinorUnits(raw.purchaseInvoice.totalAmountMinor),
      amountPaidMinor: toMinorUnits(raw.purchaseInvoice.amountPaidMinor),
      balanceDueMinor: toMinorUnits(raw.purchaseInvoice.balanceDueMinor),
    },
  };
}

export async function fetchVendorPaymentPurchaseInvoiceCatalogApi(
  token: string,
  organizationId: string,
  search?: string,
): Promise<PaginatedResponse<VendorPaymentPurchaseInvoiceOption>> {
  const query = new URLSearchParams({
    organizationId,
    page: "1",
    pageSize: "50",
  });
  if (search?.trim()) query.set("search", search.trim());
  const res = await apiFetch<
    PaginatedResponse<VendorPaymentPurchaseInvoiceOption>
  >(
    `/finance/vendor-payments/purchase-invoices/catalog?${query.toString()}`,
    { method: "GET", ...orgHeaders(organizationId, token) },
  );
  return {
    ...res,
    items: (res.items ?? []).map(normalizePurchaseInvoiceOption),
  };
}

export type CreateVendorPaymentPayload = {
  organizationId: string;
  purchaseInvoiceId: string;
  amountMinor: number;
  paymentDate: string;
  paymentMethod: string;
  paymentReference?: string;
};

export async function createVendorPaymentApi(
  token: string,
  payload: CreateVendorPaymentPayload,
): Promise<VendorPaymentDetail> {
  return apiFetch("/finance/vendor-payments", {
    method: "POST",
    ...orgHeaders(payload.organizationId, token),
    body: JSON.stringify(payload),
  });
}

export async function removeVendorPaymentApi(
  token: string,
  organizationId: string,
  paymentId: string,
): Promise<{ id: string; paymentNumber: string; removed: true }> {
  const query = new URLSearchParams({ organizationId });
  return apiFetch(
    `/finance/vendor-payments/${encodeURIComponent(paymentId)}?${query.toString()}`,
    { method: "DELETE", ...orgHeaders(organizationId, token) },
  );
}
