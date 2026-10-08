"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import OrganizationFormLayout from "@/components/common/OrganizationFormLayout";
import Button from "@/components/ui/GrubpacButton";
import { RestrictedInput } from "@/components/ui/RestrictedInput";
import { useAuth } from "@/providers/auth-provider";
import {
  fetchFinanceInvoiceDetailApi,
  fetchFinancePaymentMethodCatalogApi,
  recordFinanceInvoicePaymentApi,
} from "@/lib/api/finance/invoices";
import {
  formatInrFromMinor,
  parseRupeeInputToMinor,
} from "@/lib/format/money-format";
import {
  financeInvoiceDetailHref,
  financeInvoicesListHref,
} from "@/lib/navigation/finance-static-routes";
import { useFinanceEntityId } from "@/lib/navigation/use-finance-entity-id";
import {
  showErrorToast,
  showFinanceInvoicePaymentRecordedToast,
} from "@/lib/toast/show-toast";

export default function RecordPaymentPage() {
  const invoiceId = useFinanceEntityId("invoiceId");
  const router = useRouter();
  const queryClient = useQueryClient();
  const { token, organizationId, isLoading: authLoading, permissions } =
    useAuth();

  const canUpdate =
    permissions.has("finance.update") || permissions.has("finance.manage");

  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [paymentMethod, setPaymentMethod] = useState("");
  const [paymentReference, setPaymentReference] = useState("");

  const detailQuery = useQuery({
    queryKey: ["finance-invoice-detail", organizationId, invoiceId],
    queryFn: () =>
      fetchFinanceInvoiceDetailApi(token!, organizationId!, invoiceId!),
    enabled: !!token && !!organizationId && !!invoiceId && !authLoading,
  });

  const methodsQuery = useQuery({
    queryKey: ["finance-payment-methods", organizationId],
    queryFn: () =>
      fetchFinancePaymentMethodCatalogApi(token!, organizationId!),
    enabled: !!token && !!organizationId && !authLoading,
    staleTime: 60_000,
  });

  const invoice = detailQuery.data;
  const maxPaymentMinor = invoice?.balanceDueMinor ?? 0;
  const amountMinor = parseRupeeInputToMinor(amount);

  const canSubmit = useMemo(() => {
    if (!canUpdate || !invoice?.availableActions.recordPayment) return false;
    if (amountMinor == null || amountMinor < 1) return false;
    if (amountMinor > maxPaymentMinor) return false;
    if (!paymentDate.trim()) return false;
    if (!paymentMethod.trim()) return false;
    return true;
  }, [
    amountMinor,
    canUpdate,
    invoice?.availableActions.recordPayment,
    maxPaymentMinor,
    paymentDate,
    paymentMethod,
  ]);

  const paymentMutation = useMutation({
    mutationFn: () => {
      if (amountMinor == null) throw new Error("Invalid amount");
      return recordFinanceInvoicePaymentApi(
        token!,
        organizationId!,
        invoiceId!,
        {
          organizationId: organizationId!,
          amountMinor,
          paymentDate,
          paymentMethod: paymentMethod.trim(),
          paymentReference: paymentReference.trim() || undefined,
        },
      );
    },
    onSuccess: (detail) => {
      showFinanceInvoicePaymentRecordedToast(detail.invoiceNumber);
      void queryClient.invalidateQueries({
        queryKey: ["finance-invoice-detail", organizationId, invoiceId],
      });
      void queryClient.invalidateQueries({ queryKey: ["finance-invoices"] });
      router.push(financeInvoiceDetailHref(invoiceId!));
    },
    onError: () => showErrorToast("Could not record payment. Try again."),
  });

  if (!invoiceId) {
    return (
      <OrganizationFormLayout
        title="Record payment"
        backLink={{ label: "Back to invoices", href: financeInvoicesListHref }}
      >
        <p className="text-sm text-slate-600">Missing invoice id.</p>
      </OrganizationFormLayout>
    );
  }

  if (detailQuery.isLoading || authLoading) {
    return (
      <OrganizationFormLayout
        title="Record payment"
        backLink={{
          label: "Back to invoice",
          href: financeInvoiceDetailHref(invoiceId),
        }}
      >
        <p className="text-sm text-slate-500">Loading…</p>
      </OrganizationFormLayout>
    );
  }

  if (detailQuery.isError || !invoice) {
    return (
      <OrganizationFormLayout
        title="Record payment"
        backLink={{ label: "Back to invoices", href: financeInvoicesListHref }}
      >
        <p className="text-sm text-red-700">Invoice not found.</p>
      </OrganizationFormLayout>
    );
  }

  if (!invoice.availableActions.recordPayment) {
    return (
      <OrganizationFormLayout
        title="Record payment"
        backLink={{
          label: "Back to invoice",
          href: financeInvoiceDetailHref(invoiceId),
        }}
      >
        <p className="text-sm text-slate-600">
          Payments cannot be recorded on this invoice.
        </p>
      </OrganizationFormLayout>
    );
  }

  return (
    <OrganizationFormLayout
      title="Record payment"
      description={invoice.invoiceNumber}
      backLink={{
        label: "Back to invoice",
        href: financeInvoiceDetailHref(invoiceId),
      }}
      actions={
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            disabled={paymentMutation.isPending}
            onClick={() =>
              router.push(financeInvoiceDetailHref(invoiceId))
            }
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!canSubmit || paymentMutation.isPending}
            onClick={() => paymentMutation.mutate()}
          >
            {paymentMutation.isPending ? "Saving…" : "Record payment"}
          </Button>
        </div>
      }
    >
      <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800">
        <div className="flex flex-wrap gap-x-6 gap-y-1">
          <span>
            Total:{" "}
            <strong>{formatInrFromMinor(invoice.totalAmountMinor)}</strong>
          </span>
          <span>
            Paid so far:{" "}
            <strong>{formatInrFromMinor(invoice.amountPaidMinor)}</strong>
          </span>
          <span>
            Balance:{" "}
            <strong>{formatInrFromMinor(invoice.balanceDueMinor)}</strong>
          </span>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Amount (₹) *
          </label>
          <RestrictedInput
            restrictedKind="text"
            value={amount}
            onChange={setAmount}
            placeholder={`Max ${formatInrFromMinor(maxPaymentMinor)}`}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Payment method *
          </label>
          <select
            className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            disabled={methodsQuery.isLoading}
          >
            <option value="">Select method</option>
            {(methodsQuery.data ?? []).map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Payment date *
          </label>
          <input
            type="date"
            className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            value={paymentDate}
            onChange={(e) => setPaymentDate(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Reference (optional)
          </label>
          <RestrictedInput
            restrictedKind="text"
            value={paymentReference}
            onChange={setPaymentReference}
            maxLength={120}
            placeholder="UTR, cheque number, etc."
          />
        </div>
      </div>
    </OrganizationFormLayout>
  );
}
