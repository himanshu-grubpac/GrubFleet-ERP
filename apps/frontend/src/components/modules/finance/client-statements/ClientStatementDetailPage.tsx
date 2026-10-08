"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import OrganizationDetailCard from "@/components/common/OrganizationDetailCard";
import OrganizationViewLayout from "@/components/common/OrganizationViewLayout";
import Button from "@/components/ui/GrubpacButton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { SubPageBackLink } from "@/components/ui/SubPageBackLink";
import DashboardTable from "@/components/dashboard/DashboardTable";
import { useAuth } from "@/providers/auth-provider";
import {
  fetchClientStatementDetailApi,
  sendClientStatementApi,
} from "@/lib/api/finance/client-statements";
import { formatInrFromMinor } from "@/lib/format/money-format";
import {
  formatPeriodLabel,
  getClientStatementPeriodPresets,
} from "@/lib/finance/client-statement-periods";
import {
  financeClientStatementDetailHref,
  financeClientStatementsListHref,
  financeInvoiceDetailHref,
} from "@/lib/navigation/finance-static-routes";
import {
  FINANCE_CLIENT_STATEMENT_SEND_ERROR,
  showErrorToast,
  showFinanceClientStatementSendRecordedToast,
} from "@/lib/toast/show-toast";

function statusLabel(status: string): string {
  if (status === "partially_paid") return "Partially paid";
  if (status === "unpaid") return "Unpaid";
  if (status === "paid") return "Paid";
  if (status === "cancelled") return "Cancelled";
  return status;
}

function statusBadgeClass(status: string): string {
  switch (status) {
    case "paid":
      return "bg-emerald-100 text-emerald-700";
    case "partially_paid":
      return "bg-amber-100 text-amber-800";
    case "unpaid":
      return "bg-red-100 text-red-700";
    case "cancelled":
      return "bg-slate-100 text-slate-600";
    default:
      return "bg-slate-100 text-slate-600";
  }
}

export default function ClientStatementDetailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { token, organizationId, isLoading: authLoading, permissions } =
    useAuth();

  const periodPresets = useMemo(() => getClientStatementPeriodPresets(), []);

  const clientId = searchParams.get("clientId")?.trim() ?? "";
  const initialStart =
    searchParams.get("periodStart")?.trim() ??
    periodPresets[0]?.periodStart ??
    "";
  const initialEnd =
    searchParams.get("periodEnd")?.trim() ?? periodPresets[0]?.periodEnd ?? "";

  const [periodStart, setPeriodStart] = useState(initialStart);
  const [periodEnd, setPeriodEnd] = useState(initialEnd);
  const [sendConfirmOpen, setSendConfirmOpen] = useState(false);

  const canSend =
    permissions.has("finance.create") ||
    permissions.has("finance.update") ||
    permissions.has("finance.manage");

  const detailQuery = useQuery({
    queryKey: [
      "finance-client-statement-detail",
      organizationId,
      clientId,
      periodStart,
      periodEnd,
    ],
    queryFn: () =>
      fetchClientStatementDetailApi(
        token!,
        organizationId!,
        clientId,
        periodStart,
        periodEnd,
      ),
    enabled:
      !!token && !!organizationId && !!clientId && !!periodStart && !!periodEnd && !authLoading,
  });

  const sendMutation = useMutation({
    mutationFn: () =>
      sendClientStatementApi(token!, organizationId!, clientId, {
        organizationId: organizationId!,
        periodStart,
        periodEnd,
      }),
    onSuccess: () => {
      const name = detailQuery.data?.clientName ?? "Client";
      showFinanceClientStatementSendRecordedToast(name);
      setSendConfirmOpen(false);
      void queryClient.invalidateQueries({
        queryKey: ["finance-client-statement-detail"],
      });
    },
    onError: () => showErrorToast(FINANCE_CLIENT_STATEMENT_SEND_ERROR),
  });

  const syncPeriodToUrl = (start: string, end: string) => {
    if (!clientId) return;
    router.replace(
      financeClientStatementDetailHref(clientId, start, end),
    );
  };

  const periodLabel = formatPeriodLabel(periodStart, periodEnd, periodPresets);

  if (!clientId) {
    return (
      <OrganizationViewLayout>
        <SubPageBackLink
          href={financeClientStatementsListHref}
          label="Back to client statements"
        />
        <p className="text-sm text-slate-600">Missing client id.</p>
      </OrganizationViewLayout>
    );
  }

  if (detailQuery.isLoading || authLoading) {
    return (
      <OrganizationViewLayout>
        <p className="text-sm text-slate-500">Loading client statement…</p>
      </OrganizationViewLayout>
    );
  }

  if (detailQuery.isError || !detailQuery.data) {
    return (
      <OrganizationViewLayout>
        <SubPageBackLink
          href={financeClientStatementsListHref}
          label="Back to client statements"
        />
        <p className="text-sm text-red-700">Client statement not found.</p>
      </OrganizationViewLayout>
    );
  }

  const detail = detailQuery.data;
  const summary = detail.summary;
  const canSendStatement =
    canSend && detail.billableInvoiceCount > 0 && !sendMutation.isPending;

  return (
    <OrganizationViewLayout>
      <SubPageBackLink
        href={financeClientStatementsListHref}
        label="Back to client statements"
      />

      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[15px] font-semibold text-gray-900">
            {detail.clientName}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {detail.billingInvoiceCount} Billing invoice
            {detail.billingInvoiceCount === 1 ? "" : "s"} in {periodLabel}
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
            Period
            <select
              className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
              value={
                periodPresets.find(
                  (p) =>
                    p.periodStart === periodStart &&
                    p.periodEnd === periodEnd,
                )?.id ?? `${periodStart}_${periodEnd}`
              }
              onChange={(e) => {
                const preset = periodPresets.find((p) => p.id === e.target.value);
                if (preset) {
                  setPeriodStart(preset.periodStart);
                  setPeriodEnd(preset.periodEnd);
                  syncPeriodToUrl(preset.periodStart, preset.periodEnd);
                }
              }}
            >
              {periodPresets.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
          {canSend ? (
            <Button
              type="button"
              disabled={!canSendStatement}
              onClick={() => setSendConfirmOpen(true)}
            >
              Send Statement
            </Button>
          ) : null}
        </div>
      </div>

      <OrganizationDetailCard>
        <h2 className="mb-4 text-sm font-semibold text-gray-900">Summary</h2>
        <dl className="grid gap-4 sm:grid-cols-3">
          <div>
            <dt className="text-xs font-medium text-slate-500">Total billed</dt>
            <dd className="mt-1 text-sm font-semibold text-slate-900">
              {formatInrFromMinor(summary.totalBilledMinor)}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-500">Total paid</dt>
            <dd className="mt-1 text-sm font-semibold text-slate-900">
              {formatInrFromMinor(summary.totalPaidMinor)}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-500">Balance due</dt>
            <dd
              className={`mt-1 text-sm font-semibold ${
                summary.balanceDueMinor > 0
                  ? "text-[#FE5720]"
                  : "text-slate-900"
              }`}
            >
              {formatInrFromMinor(summary.balanceDueMinor)}
            </dd>
          </div>
        </dl>
      </OrganizationDetailCard>

      <OrganizationDetailCard className="mt-4">
        <h2 className="mb-4 text-sm font-semibold text-gray-900">Invoices</h2>
        {detail.invoices.length === 0 ? (
          <p className="text-sm text-slate-500">
            No billing invoices in this period for this client.
          </p>
        ) : (
          <DashboardTable
            columns={[
              {
                key: "invoiceNumber",
                label: "INVOICE NO",
                render: (row) => (
                  <button
                    type="button"
                    className="text-left text-sm font-medium text-[#FE5720] hover:underline"
                    onClick={() =>
                      router.push(financeInvoiceDetailHref(row.id))
                    }
                  >
                    {row.invoiceNumber}
                  </button>
                ),
              },
              {
                key: "invoiceDate",
                label: "DATE",
                render: (row) => row.invoiceDate,
              },
              {
                key: "description",
                label: "DESCRIPTION",
                render: (row) => (
                  <span className="line-clamp-2 max-w-md text-sm text-slate-700">
                    {row.description}
                  </span>
                ),
              },
              {
                key: "amountMinor",
                label: "AMOUNT",
                render: (row) => formatInrFromMinor(row.amountMinor),
              },
              {
                key: "status",
                label: "STATUS",
                render: (row) => (
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeClass(row.status)}`}
                  >
                    {statusLabel(row.status)}
                  </span>
                ),
              },
            ]}
            data={detail.invoices}
            getRowKey={(row) => row.id}
          />
        )}
      </OrganizationDetailCard>

      <ConfirmDialog
        open={sendConfirmOpen}
        title="Record statement send?"
        message={`This records a statement send for ${detail.clientName} for ${periodLabel}. Email delivery is not enabled yet — no message will be sent.`}
        confirmLabel="Record send"
        cancelLabel="Cancel"
        isConfirmPending={sendMutation.isPending}
        confirmDisabled={!canSendStatement}
        onConfirm={() => sendMutation.mutate()}
        onClose={() => setSendConfirmOpen(false)}
      />
    </OrganizationViewLayout>
  );
}
