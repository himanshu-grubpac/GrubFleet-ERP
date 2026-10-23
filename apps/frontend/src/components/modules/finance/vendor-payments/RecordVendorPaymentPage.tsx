
"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { invalidateFinancePaymentCaches } from "@/lib/query/invalidate-domain-caches";

import FormActions from "@/components/common/FormActions";
import OrganizationFormLayout from "@/components/common/OrganizationFormLayout";
import { RestrictedInput } from "@/components/ui/RestrictedInput";
import {
  FormFieldInlineError,
  mergeFormControlBorderClass,
} from "@/components/ui/form-field-inline-error";
import { localTodayIsoDate } from "@/lib/format/date-format";
import { useAuth } from "@/providers/auth-provider";

import {
  fetchFinancePaymentMethodCatalogApi,
} from "@/lib/api/finance/invoices";

import {
  createVendorPaymentApi,
  fetchAllVendorPaymentPurchaseInvoiceCatalogApi,
} from "@/lib/api/finance/vendor-payments";

import {
  formatInrFromMinor,
  INR_RUPEE_INPUT_PLACEHOLDER,
  parseRupeeInputToMinor,
} from "@/lib/format/money-format";

import {
  financeVendorPaymentsListHref,
} from "@/lib/navigation/finance-static-routes";

import {
  validateRequired,
  validateNumber,
  validateDate,
} from "@/components/common/Commonvalidation";

import { FINANCE_VENDOR_PAYMENT_INPUT_LIMITS } from "@/lib/forms/restricted-input";

import {
  FINANCE_VENDOR_PAYMENT_SAVE_ERROR,
  showApiErrorToast,
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
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);

  const isSubmittingRef = useRef(false);

  const catalogQuery = useQuery({
    queryKey: ["finance-vendor-payment-invoice-catalog", organizationId],
    queryFn: () =>
      fetchAllVendorPaymentPurchaseInvoiceCatalogApi(token!, organizationId!),
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
      catalogQuery.data?.find(
        (invoice) => invoice.id === purchaseInvoiceId,
      ) ?? null,
    [catalogQuery.data, purchaseInvoiceId],
  );

  const maxPaymentMinor = selectedInvoice?.balanceDueMinor ?? 0;
  const amountMinor = parseRupeeInputToMinor(amount);

  const validationErrors = useMemo(() => {
    const errors: string[] = [];

    const invoiceError = validateRequired(
      purchaseInvoiceId,
      "Purchase invoice",
    );

    if (invoiceError) {
      errors.push(invoiceError);
    }

    const amountRequiredError = validateRequired(amount, "Amount");

    if (amountRequiredError) {
      errors.push(amountRequiredError);
    } else if (amountMinor == null) {
      errors.push("Enter a valid amount.");
    } else {
      const amountError = validateNumber(amountMinor, {
        label: "Amount",
        min: 1,
        integer: true,
      });

      if (amountError) {
        errors.push(amountError);
      }

      if (amountMinor > maxPaymentMinor) {
        errors.push(
          `Amount cannot exceed the balance due of ${formatInrFromMinor(
            maxPaymentMinor,
          )}.`,
        );
      }
    }

    const dateError = validateDate(paymentDate, {
      label: "Payment date",
      maxDate: localTodayIsoDate(),
      minDate: selectedInvoice?.invoiceDate?.slice(0, 10) || undefined,
    });

    if (dateError) {
      errors.push(dateError);
    }

    const methodError = validateRequired(paymentMethod, "Payment method");

    if (methodError) {
      errors.push(methodError);
    }

    return errors;
  }, [
    purchaseInvoiceId,
    amount,
    amountMinor,
    maxPaymentMinor,
    paymentDate,
    paymentMethod,
    selectedInvoice?.invoiceDate,
  ]);

  const recordMutation = useMutation({
    mutationFn: () => {
      if (!token || !organizationId || amountMinor == null || !paymentDate) {
        throw new Error("Please enter valid payment information.");
      }

      return createVendorPaymentApi(token, {
        organizationId,
        purchaseInvoiceId,
        amountMinor,
        paymentDate,
        paymentMethod,
        paymentReference: paymentReference.trim() || undefined,
      });
    },

    onSuccess: (data) => {
      showFinanceVendorPaymentRecordedToast(data.paymentNumber);

      void invalidateFinancePaymentCaches(queryClient);

      router.push(financeVendorPaymentsListHref);
    },

    onError: (error) => {
      showApiErrorToast(error, FINANCE_VENDOR_PAYMENT_SAVE_ERROR);
    },

    onSettled: () => {
      isSubmittingRef.current = false;
    },
  });

  const handleSave = () => {
    setHasAttemptedSubmit(true);

    if (validationErrors.length > 0) return;
    if (isSubmittingRef.current || recordMutation.isPending) return;
    if (!token || !organizationId) return;

    isSubmittingRef.current = true;
    recordMutation.mutate();
  };

  const contextBanner = selectedInvoice ? (
    <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800">
      Paid so far: {formatInrFromMinor(selectedInvoice.amountPaidMinor)} ·
      Balance due:{" "}
      <span className="font-medium text-[#FE5720]">
        {formatInrFromMinor(selectedInvoice.balanceDueMinor)}
      </span>
    </div>
  ) : null;

  const displayedValidationErrors = hasAttemptedSubmit
    ? validationErrors
    : [];

  const selectBaseClass =
    "rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-200";

  const selectBorderClass = (hasError: boolean) =>
    mergeFormControlBorderClass(hasError, selectBaseClass);

  const controlBaseClass =
    "w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-200";

  const controlBorderClass = (hasError: boolean) =>
    mergeFormControlBorderClass(hasError, controlBaseClass);

  const purchaseInvoiceInvalid = hasAttemptedSubmit && !purchaseInvoiceId;
  const amountRequiredInvalid = hasAttemptedSubmit && !amount.trim();
  const amountInvalid =
    hasAttemptedSubmit && amount.trim() && amountMinor === null;
  const amountNonPositiveInvalid =
    hasAttemptedSubmit && amountMinor !== null && amountMinor <= 0;
  const paymentDateInvalid = hasAttemptedSubmit && !paymentDate;
  const paymentMethodInvalid = hasAttemptedSubmit && !paymentMethod;

  return (
    <OrganizationFormLayout
      title="Record Payment"
      actions={
        <FormActions
          hasAttemptedSubmit={hasAttemptedSubmit}
          validationSummary={displayedValidationErrors}
          isSaving={recordMutation.isPending}
          canSubmit={
            canRecord &&
            !recordMutation.isPending &&
            validationErrors.length === 0
          }
          onCancel={() => router.push(financeVendorPaymentsListHref)}
          onSave={handleSave}
          saveLabel="Record payment"
          savingLabel="Recording..."
        />
      }
    >
      {!canRecord ? (
        <p className="text-sm text-slate-600">
          You do not have permission to record vendor payments.
        </p>
      ) : (
        <div className="space-y-4">
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
              className={selectBorderClass(purchaseInvoiceInvalid)}
              value={purchaseInvoiceId}
              onChange={(event) => {
                setPurchaseInvoiceId(event.target.value);
                setAmount("");
              }}
              disabled={catalogQuery.isLoading || recordMutation.isPending}
              aria-invalid={hasAttemptedSubmit && !purchaseInvoiceId}
            >
              <option value="">
                {catalogQuery.isLoading
                  ? "Loading invoices…"
                  : "Select purchase invoice"}
              </option>

              {(catalogQuery.data ?? []).map((invoice) => (
                <option key={invoice.id} value={invoice.id}>
                  {invoice.invoiceNumber} — {invoice.vendorName} (balance{" "}
                  {formatInrFromMinor(invoice.balanceDueMinor)})
                </option>
              ))}
            </select>
            <FormFieldInlineError
              message={
                purchaseInvoiceInvalid
                  ? "Purchase invoice is required."
                  : undefined
              }
            />
          </label>

          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Amount (INR) *
            <RestrictedInput
              restrictedKind="inrRupee"
              value={amount}
              onChange={setAmount}
              placeholder={INR_RUPEE_INPUT_PLACEHOLDER}
              disabled={!purchaseInvoiceId || recordMutation.isPending}
              className={controlBorderClass(
                amountRequiredInvalid ||
                  amountInvalid ||
                  amountNonPositiveInvalid ||
                  Boolean(
                    selectedInvoice &&
                      amountMinor != null &&
                      amountMinor > maxPaymentMinor,
                  ),
              )}
            />

            {selectedInvoice &&
            amountMinor != null &&
            amountMinor > maxPaymentMinor ? (
              <FormFieldInlineError
                message={`Cannot exceed balance ${formatInrFromMinor(maxPaymentMinor)}`}
              />
            ) : null}
            <FormFieldInlineError
              message={
                amountRequiredInvalid
                  ? "Amount is required."
                  : amountInvalid
                    ? "Enter a valid amount."
                    : amountNonPositiveInvalid
                      ? "Amount must be greater than zero."
                      : undefined
              }
            />
          </label>

          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Payment date *
            <input
              type="date"
              max={localTodayIsoDate()}
              min={selectedInvoice?.invoiceDate?.slice(0, 10) || undefined}
              className={controlBorderClass(paymentDateInvalid)}
              value={paymentDate}
              onChange={(event) => setPaymentDate(event.target.value)}
              disabled={recordMutation.isPending}
              aria-invalid={hasAttemptedSubmit && !paymentDate}
            />
            <FormFieldInlineError
              message={
                paymentDateInvalid ? "Payment date is required." : undefined
              }
            />
          </label>

          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Payment method *
            <select
              className={selectBorderClass(paymentMethodInvalid)}
              value={paymentMethod}
              onChange={(event) => setPaymentMethod(event.target.value)}
              disabled={methodsQuery.isLoading || recordMutation.isPending}
              aria-invalid={hasAttemptedSubmit && !paymentMethod}
            >
              <option value="">Select method</option>

              {(methodsQuery.data ?? []).map((method) => (
                <option key={method.value} value={method.value}>
                  {method.label}
                </option>
              ))}
            </select>

            <FormFieldInlineError
              message={
                paymentMethodInvalid
                  ? "Payment method is required."
                  : undefined
              }
            />

            {methodsQuery.isError ? (
              <span className="text-xs font-normal text-red-600">
                Could not load payment methods. Please retry or refresh.
              </span>
            ) : null}
          </label>

          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Reference no. (optional)
            <RestrictedInput
              restrictedKind="text"
              maxLength={FINANCE_VENDOR_PAYMENT_INPUT_LIMITS.paymentReference}
              value={paymentReference}
              onChange={setPaymentReference}
              disabled={recordMutation.isPending}
            />
          </label>
        </div>
      )}
    </OrganizationFormLayout>
  );
}
