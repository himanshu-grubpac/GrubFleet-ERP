"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import OrganizationFormLayout from "@/components/common/OrganizationFormLayout";
import Button from "@/components/ui/GrubpacButton";
import { RestrictedInput } from "@/components/ui/RestrictedInput";
import { useAuth } from "@/providers/auth-provider";
import { fetchFinancePaymentMethodCatalogApi } from "@/lib/api/finance/invoices";
import {
  createVendorPaymentApi,
  fetchVendorPaymentPurchaseInvoiceCatalogApi,
} from "@/lib/api/finance/vendor-payments";
import {
  formatInrFromMinor,
  parseRupeeInputToMinor,
} from "@/lib/format/money-format";
import { financeVendorPaymentsListHref } from "@/lib/navigation/finance-static-routes";
import {
  FINANCE_VENDOR_PAYMENT_SAVE_ERROR,
  showErrorToast,
  showFinanceVendorPaymentRecordedToast,
} from "@/lib/toast/show-toast";

export default function RecordVendorPaymentPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const {
    token,
    organizationId,
    isLoading: authLoading,
    permissions,
    getApiError,
  } = useAuth();

  const canRecord =
    permissions.has("finance.create") ||
    permissions.has("finance.update") ||
    permissions.has("finance.manage");

  const [purchaseInvoiceId, setPurchaseInvoiceId] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [paymentMethod, setPaymentMethod] = useState("");
  const [paymentReference, setPaymentReference] = useState("");

  const catalogQuery = useQuery({
    queryKey: ["finance-vendor-payment-invoice-catalog", organizationId],
    queryFn: () =>
      fetchVendorPaymentPurchaseInvoiceCatalogApi(token!, organizationId!),
    enabled: !!token && !!organizationId && !authLoading,
    staleTime: 30_000,
  });

  const methodsQuery = useQuery({
    queryKey: ["finance-payment-methods", organizationId],
    queryFn: () =>
      fetchFinancePaymentMethodCatalogApi(token!, organizationId!),
    enabled: !!token && !!organizationId && !authLoading,
    staleTime: 60_000,
  });

  const selectedInvoice = useMemo(
    () =>
      catalogQuery.data?.items.find((inv) => inv.id === purchaseInvoiceId) ??
      null,
    [catalogQuery.data?.items, purchaseInvoiceId],
  );

  const maxPaymentMinor = selectedInvoice?.balanceDueMinor ?? 0;
  const amountMinor = parseRupeeInputToMinor(amount);

  const canSubmit = useMemo(() => {
    if (!canRecord || !purchaseInvoiceId) return false;
    if (amountMinor == null || amountMinor < 1) return false;
    if (amountMinor > maxPaymentMinor) return false;
    if (!paymentDate.trim()) return false;
    if (!paymentMethod.trim()) return false;
    return true;
  }, [
    amountMinor,
    canRecord,
    maxPaymentMinor,
    paymentDate,
    paymentMethod,
    purchaseInvoiceId,
  ]);

  const recordMutation = useMutation({
    mutationFn: () =>
      createVendorPaymentApi(token!, {
        organizationId: organizationId!,
        purchaseInvoiceId,
        amountMinor: amountMinor!,
        paymentDate,
        paymentMethod,
        paymentReference: paymentReference.trim() || undefined,
      }),
    onSuccess: (data) => {
      showFinanceVendorPaymentRecordedToast(data.paymentNumber);
      void queryClient.invalidateQueries({
        queryKey: ["finance-vendor-payments"],
      });
      void queryClient.invalidateQueries({ queryKey: ["finance-invoices"] });
      void queryClient.invalidateQueries({
        queryKey: ["finance-invoice-detail"],
      });
      router.push(financeVendorPaymentsListHref);
    },
    onError: () => {
      showErrorToast(FINANCE_VENDOR_PAYMENT_SAVE_ERROR);
    },
  });

  const contextBanner =
    selectedInvoice != null ? (
      <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800">
        Paid so far: {formatInrFromMinor(selectedInvoice.amountPaidMinor)} ·
        Balance due:{" "}
        <span className="font-medium text-[#FE5720]">
          {formatInrFromMinor(selectedInvoice.balanceDueMinor)}
        </span>
      </div>
    ) : null;

  return (
    <OrganizationFormLayout
      title="Record Payment"
      backLink={{
        href: financeVendorPaymentsListHref,
        label: "Vendor payments",
      }}
    >
      {!canRecord ? (
        <p className="text-sm text-slate-600">
          You do not have permission to record vendor payments.
        </p>
      ) : (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (canSubmit && !recordMutation.isPending) {
              recordMutation.mutate();
            }
          }}
        >
          {contextBanner}

          {catalogQuery.isError ? (
            <div className="rounded-lg border border-red-100 bg-red-50 p-4 text-sm text-red-800">
              Could not load purchase invoices for this form.
              {catalogQuery.error
                ? ` ${getApiError?.(catalogQuery.error) ?? "Request failed."}`
                : null}{" "}
              <button
                type="button"
                className="font-medium underline"
                onClick={() => void catalogQuery.refetch()}
              >
                Retry
              </button>
            </div>
          ) : null}

          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Purchase invoice *
            <select
              className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
              value={purchaseInvoiceId}
              onChange={(e) => {
                setPurchaseInvoiceId(e.target.value);
                setAmount("");
              }}
              disabled={catalogQuery.isLoading || recordMutation.isPending}
            >
              <option value="">
                {catalogQuery.isLoading
                  ? "Loading invoices…"
                  : "Select purchase invoice"}
              </option>
              {(catalogQuery.data?.items ?? []).map((inv) => (
                <option key={inv.id} value={inv.id}>
                  {inv.invoiceNumber} — {inv.vendorName} (balance{" "}
                  {formatInrFromMinor(inv.balanceDueMinor)})
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Amount (INR) *
            <RestrictedInput
              restrictedKind="text"
              value={amount}
              onChange={setAmount}
              placeholder={`Max ${formatInrFromMinor(maxPaymentMinor)}`}
              disabled={!purchaseInvoiceId || recordMutation.isPending}
            />
            {selectedInvoice && amountMinor != null && amountMinor > maxPaymentMinor ? (
              <span className="text-xs text-red-600">
                Cannot exceed balance {formatInrFromMinor(maxPaymentMinor)}
              </span>
            ) : null}
          </label>

          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Payment date *
            <input
              type="date"
              className="rounded-md border border-slate-200 px-3 py-2 text-sm"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              disabled={recordMutation.isPending}
            />
          </label>

          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Payment method *
            <select
              className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              disabled={methodsQuery.isLoading || recordMutation.isPending}
            >
              <option value="">Select method</option>
              {(methodsQuery.data ?? []).map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Reference no. (optional)
            <RestrictedInput
              restrictedKind="text"
              maxLength={120}
              value={paymentReference}
              onChange={setPaymentReference}
              disabled={recordMutation.isPending}
            />
          </label>

          <div className="flex flex-wrap gap-3 pt-2">
            <Button
              type="submit"
              disabled={!canSubmit || recordMutation.isPending}
            >
              Record payment
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={recordMutation.isPending}
              onClick={() => router.push(financeVendorPaymentsListHref)}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}
    </OrganizationFormLayout>
  );
}
