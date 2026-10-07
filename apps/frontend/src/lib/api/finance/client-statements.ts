import type { PaginatedResponse } from "@grubpac/shared-types";
import { apiFetch } from "../client";
import type { FinanceInvoiceStatus } from "./invoices";

function orgHeaders(organizationId: string, token: string) {
  return {
    token,
    headers: { "x-organization-id": organizationId },
  };
}

export type ClientStatementListItem = {
  clientId: string;
  clientName: string;
  isActive: boolean;
  invoiceCount: number;
  totalBilledMinor: number;
  totalPaidMinor: number;
  balanceDueMinor: number;
  hasBillingActivityInPeriod: boolean;
};

export type ClientStatementListResponse = PaginatedResponse<ClientStatementListItem> & {
  hasAnyBillingInvoicesEver: boolean;
  periodStart: string;
  periodEnd: string;
};

export type ClientStatementSummary = {
  totalBilledMinor: number;
  totalPaidMinor: number;
  balanceDueMinor: number;
};

export type ClientStatementInvoiceRow = {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  description: string;
  amountMinor: number;
  status: FinanceInvoiceStatus;
  excludedFromSummaryTotals: boolean;
};

export type ClientStatementDetail = {
  clientId: string;
  clientName: string;
  isActive: boolean;
  periodStart: string;
  periodEnd: string;
  billingInvoiceCount: number;
  billableInvoiceCount: number;
  summary: ClientStatementSummary;
  invoices: ClientStatementInvoiceRow[];
};

export type ClientStatementSendResult = {
  clientId: string;
  periodStart: string;
  periodEnd: string;
  recorded: boolean;
  emailDispatch: "deferred";
};

export async function fetchClientStatementsApi(
  token: string,
  params: {
    organizationId: string;
    periodStart: string;
    periodEnd: string;
    page?: number;
    pageSize?: number;
    search?: string;
  },
): Promise<ClientStatementListResponse> {
  const query = new URLSearchParams({
    organizationId: params.organizationId,
    periodStart: params.periodStart,
    periodEnd: params.periodEnd,
    page: String(params.page ?? 1),
    pageSize: String(params.pageSize ?? 10),
  });
  if (params.search?.trim()) {
    query.set("search", params.search.trim());
  }
  return apiFetch(`/finance/client-statements?${query.toString()}`, {
    method: "GET",
    ...orgHeaders(params.organizationId, token),
  });
}

export async function fetchClientStatementDetailApi(
  token: string,
  organizationId: string,
  clientId: string,
  periodStart: string,
  periodEnd: string,
): Promise<ClientStatementDetail> {
  const query = new URLSearchParams({
    organizationId,
    periodStart,
    periodEnd,
  });
  return apiFetch(
    `/finance/client-statements/${encodeURIComponent(clientId)}?${query.toString()}`,
    {
      method: "GET",
      ...orgHeaders(organizationId, token),
    },
  );
}

export async function sendClientStatementApi(
  token: string,
  organizationId: string,
  clientId: string,
  body: {
    organizationId: string;
    periodStart: string;
    periodEnd: string;
  },
): Promise<ClientStatementSendResult> {
  return apiFetch(
    `/finance/client-statements/${encodeURIComponent(clientId)}/send`,
    {
      method: "POST",
      body: JSON.stringify(body),
      ...orgHeaders(organizationId, token),
    },
  );
}
