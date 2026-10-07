"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import DetailField from "@/components/common/DetailField";
import OrganizationDetailCard, {
  OrganizationDetailFieldGrid,
} from "@/components/common/OrganizationDetailCard";
import OrganizationViewLayout from "@/components/common/OrganizationViewLayout";
import Button from "@/components/ui/GrubpacButton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { SubPageBackLink } from "@/components/ui/SubPageBackLink";
import { useAuth } from "@/providers/auth-provider";
import {
  cancelFinanceInvoiceApi,
  fetchFinanceInvoiceDetailApi,
  removeFinancePurchaseInvoiceApi,
} from "@/lib/api/finance/invoices";
import { formatInrFromMinor } from "@/lib/format/money-format";
import {
  financeInvoiceEditBillingHref,
  financeInvoiceEditSaleHref,
  financeInvoiceRecordPaymentHref,
  financeInvoicesListHref,
  financeVendorPaymentDetailHref,
  financeVendorPaymentsListHref,
} from "@/lib/navigation/finance-static-routes";
import { useFinanceEntityId } from "@/lib/navigation/use-finance-entity-id";
import {
  FINANCE_INVOICE_CANCEL_ERROR,
  FINANCE_INVOICE_REMOVE_ERROR,
  showErrorToast,
  showFinanceInvoiceCancelledToast,
  showFinanceInvoiceRemovedToast,
} from "@/lib/toast/show-toast";

export default function InvoiceDetailPage() {
  const invoiceId = useFinanceEntityId("invoiceId");
  const router = useRouter();
  const queryClient = useQueryClient();
  const { token, organizationId, isLoading: authLoading, permissions } =
    useAuth();

  const canUpdate =
    permissions.has("finance.update") || permissions.has("finance.manage");
  const canDelete =
    permissions.has("finance.delete") || permissions.has("finance.manage");

  const [cancelOpen, setCancelOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);

  const detailQuery = useQuery({
    queryKey: ["finance-invoice-detail", organizationId, invoiceId],
    queryFn: () =>
      fetchFinanceInvoiceDetailApi(token!, organizationId!, invoiceId!),
    enabled: !!token && !!organizationId && !!invoiceId && !authLoading,
  });

  const cancelMutation = useMutation({
    mutationFn: () =>
      cancelFinanceInvoiceApi(token!, organizationId!, invoiceId!),
    onSuccess: (detail) => {
      showFinanceInvoiceCancelledToast(detail.invoiceNumber);
      setCancelOpen(false);
      void queryClient.invalidateQueries({
        queryKey: ["finance-invoice-detail", organizationId, invoiceId],
      });
      void queryClient.invalidateQueries({ queryKey: ["finance-invoices"] });
    },
    onError: () => showErrorToast(FINANCE_INVOICE_CANCEL_ERROR),
  });

  const removeMutation = useMutation({
    mutationFn: () =>
      removeFinancePurchaseInvoiceApi(token!, organizationId!, invoiceId!),
    onSuccess: (result) => {
      showFinanceInvoiceRemovedToast(result.invoiceNumber);
      setRemoveOpen(false);
      void queryClient.invalidateQueries({ queryKey: ["finance-invoices"] });
      router.push(financeInvoicesListHref);
    },
    onError: () => showErrorToast(FINANCE_INVOICE_REMOVE_ERROR),
  });

  if (!invoiceId) {
    return (
      <OrganizationViewLayout>
        <SubPageBackLink
          href={financeInvoicesListHref}
          label="Back to invoices"
        />
        <p className="text-sm text-slate-600">Missing invoice id.</p>
      </OrganizationViewLayout>
    );
  }

  if (detailQuery.isLoading || authLoading) {
    return (
      <OrganizationViewLayout>
        <p className="text-sm text-slate-500">Loading invoice…</p>
      </OrganizationViewLayout>
    );
  }

  if (detailQuery.isError || !detailQuery.data) {
    return (
      <OrganizationViewLayout>
        <SubPageBackLink
          href={financeInvoicesListHref}
          label="Back to invoices"
        />
        <p className="text-sm text-red-700">Invoice not found.</p>
      </OrganizationViewLayout>
    );
  }

  const invoice = detailQuery.data;
  const actions = invoice.availableActions;
  const summary = invoice.paymentSummary;

  const editHref =
    invoice.invoiceType === "sale"
      ? financeInvoiceEditSaleHref(invoice.id)
      : invoice.invoiceType === "billing"
        ? financeInvoiceEditBillingHref(invoice.id)
        : null;

  const cancelMessage =
    invoice.amountPaidMinor > 0
      ? `${invoice.invoiceNumber} — ${invoice.partyName}. This invoice has received ${formatInrFromMinor(invoice.amountPaidMinor)} in payments. Cancelling will mark it cancelled; reconcile payments separately if needed.`
      : `${invoice.invoiceNumber} will be marked cancelled and hidden from the default list.`;

  return (
    <OrganizationViewLayout>
      <SubPageBackLink href={financeInvoicesListHref} label="Back to invoices" />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-[15px] font-semibold text-gray-900">
            {invoice.invoiceNumber}
          </h1>
          <span className="rounded-full bg-orange-50 px-2.5 py-1 text-xs font-medium text-[#FE5720]">
            {invoice.invoiceType}
          </span>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
            {invoice.status.replace("_", " ")}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {actions.edit && canUpdate && editHref ? (
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                window.location.href = editHref;
              }}
            >
              Edit
            </Button>
          ) : null}
          {actions.recordPayment && canUpdate ? (
            <Button
              type="button"
              onClick={() =>
                router.push(financeInvoiceRecordPaymentHref(invoice.id))
              }
            >
              Record payment
            </Button>
          ) : null}
          {actions.cancel && canDelete ? (
            <Button
              type="button"
              variant="secondary"
              onClick={() => setCancelOpen(true)}
            >
              Cancel invoice
            </Button>
          ) : null}
          {actions.remove && canDelete ? (
            <Button
              type="button"
              variant="secondary"
              onClick={() => setRemoveOpen(true)}
            >
              Remove
            </Button>
          ) : null}
        </div>
      </div>

      <OrganizationDetailCard>
        <h2 className="mb-4 text-sm font-semibold text-gray-900">Invoice</h2>
        <OrganizationDetailFieldGrid>
          <DetailField label="Type" value={invoice.invoiceType} />
          <DetailField label="Party" value={invoice.partyName} />
          {invoice.partyEmail ? (
            <DetailField label="Email" value={invoice.partyEmail} />
          ) : null}
          <DetailField label="Description" value={invoice.description} />
          <DetailField label="Date" value={invoice.invoiceDate} />
          <DetailField
            label="Amount"
            value={formatInrFromMinor(invoice.totalAmountMinor)}
          />
          {invoice.billingPeriod ? (
            <DetailField label="Billing period" value={invoice.billingPeriod} />
          ) : null}
          {invoice.leaseContractNumber ? (
            <DetailField
              label="Lease contract"
              value={invoice.leaseContractNumber}
            />
          ) : null}
          {invoice.notes ? (
            <DetailField label="Notes" value={invoice.notes} />
          ) : null}
          {invoice.cancelReason ? (
            <DetailField label="Cancel reason" value={invoice.cancelReason} />
          ) : null}
        </OrganizationDetailFieldGrid>
      </OrganizationDetailCard>

      <OrganizationDetailCard className="mt-4">
        <h2 className="mb-4 text-sm font-semibold text-gray-900">Payment</h2>
        {summary.readOnly && summary.readOnlyMessage ? (
          <p className="mb-3 text-sm text-slate-600">{summary.readOnlyMessage}</p>
        ) : null}
        <OrganizationDetailFieldGrid>
          <DetailField
            label="Amount paid"
            value={formatInrFromMinor(summary.amountPaidMinor)}
          />
          <DetailField
            label="Balance due"
            value={formatInrFromMinor(summary.balanceDueMinor)}
          />
        </OrganizationDetailFieldGrid>
        {invoice.payments.length > 0 ? (
          <ul className="mt-4 space-y-2 text-sm text-slate-700">
            {invoice.payments.map((p) => (
              <li
                key={p.id}
                className="rounded-md border border-slate-100 bg-slate-50 px-3 py-2"
              >
                {summary.readOnly && p.paymentNumber ? (
                  <Link
                    href={financeVendorPaymentDetailHref(p.id)}
                    className="font-medium text-[#FE5720] hover:underline"
                  >
                    {p.paymentNumber}
                  </Link>
                ) : null}
                {summary.readOnly && p.paymentNumber ? " — " : null}
                {formatInrFromMinor(p.amountMinor)} on {p.paymentDate}
                {p.paymentMethod ? ` · ${p.paymentMethod}` : ""}
                {p.paymentReference ? ` · Ref ${p.paymentReference}` : ""}
              </li>
            ))}
          </ul>
        ) : null}
        {summary.readOnly ? (
          <p className="mt-3 text-sm">
            <Link
              href={financeVendorPaymentsListHref}
              className="font-medium text-[#FE5720] hover:underline"
            >
              Vendor Payments
            </Link>
          </p>
        ) : null}
      </OrganizationDetailCard>

      {invoice.referencedBy.length > 0 ? (
        <OrganizationDetailCard className="mt-4">
          <h2 className="mb-4 text-sm font-semibold text-gray-900">
            Referenced by
          </h2>
          <ul className="space-y-2 text-sm text-slate-700">
            {invoice.referencedBy.map((link) => (
              <li
                key={`${link.kind}-${link.label}`}
                className="rounded-md border border-slate-100 bg-slate-50 px-3 py-2"
              >
                {link.label}
              </li>
            ))}
          </ul>
        </OrganizationDetailCard>
      ) : null}

      {invoice.lines.length > 0 ? (
        <OrganizationDetailCard className="mt-4">
          <h2 className="mb-4 text-sm font-semibold text-gray-900">
            Line items
          </h2>
          <ul className="space-y-3 text-sm text-slate-700">
            {invoice.lines.map((line) => (
              <li
                key={line.id}
                className="rounded-md border border-slate-100 bg-slate-50 px-3 py-2"
              >
                {line.lineKind === "vehicle" ? (
                  <span>
                    Vehicle — class {line.assetClassName} ·{" "}
                    {formatInrFromMinor(line.lineAmountMinor)}
                  </span>
                ) : line.lineKind === "sale_vehicle" ? (
                  <span>
                    Sale vehicle · {formatInrFromMinor(line.lineAmountMinor)}
                  </span>
                ) : line.lineKind === "billing_lease" ? (
                  <span>
                    Lease billing · {formatInrFromMinor(line.lineAmountMinor)}
                  </span>
                ) : (
                  <span>
                    Spare parts — {line.inventoryPartName ?? "Part"} ×{" "}
                    {line.quantity} @{" "}
                    {line.unitCostMinor != null
                      ? formatInrFromMinor(line.unitCostMinor)
                      : "—"}{" "}
                    {line.batchLot ? `(Lot ${line.batchLot})` : ""}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </OrganizationDetailCard>
      ) : null}

      <ConfirmDialog
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title="Cancel invoice?"
        message={cancelMessage}
        confirmLabel="Cancel invoice"
        cancelLabel="Keep invoice"
        variant="destructive"
        isConfirmPending={cancelMutation.isPending}
        onConfirm={() => cancelMutation.mutate()}
      />

      <ConfirmDialog
        open={removeOpen}
        onClose={() => setRemoveOpen(false)}
        title="Remove purchase invoice?"
        message={`${invoice.invoiceNumber} will be permanently removed from the register. This cannot be undone.`}
        confirmLabel="Remove invoice"
        cancelLabel="Keep invoice"
        variant="destructive"
        isConfirmPending={removeMutation.isPending}
        onConfirm={() => removeMutation.mutate()}
      />
    </OrganizationViewLayout>
  );
}
