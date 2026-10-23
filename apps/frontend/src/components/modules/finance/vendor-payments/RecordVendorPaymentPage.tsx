
"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import FormActions from "@/components/common/FormActions";
import OrganizationFormLayout from "@/components/common/OrganizationFormLayout";
import { RestrictedInput } from "@/components/ui/RestrictedInput";
import {
  FormFieldInlineError,
  mergeFormControlBorderClass,
} from "@/components/ui/form-field-inline-error";
import { useAuth } from "@/providers/auth-provider";

import {
  fetchFinancePaymentMethodCatalogApi,
} from "@/lib/api/finance/invoices";

import {
  createVendorPaymentApi,
  fetchVendorPaymentPurchaseInvoiceCatalogApi,
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
  sanitizeDDMMYYYYInput,
} from "@/components/common/Commonvalidation";

import { FINANCE_VENDOR_PAYMENT_INPUT_LIMITS } from "@/lib/forms/restricted-input";

import {
  FINANCE_VENDOR_PAYMENT_SAVE_ERROR,
  showApiErrorToast,
  showFinanceVendorPaymentRecordedToast,
} from "@/lib/toast/show-toast";

/**
 * Convert a displayed DD-MM-YYYY date into the ISO date format
 * expected by the API. Invalid or incomplete dates return an empty string.
 */
function toISODate(value: string): string {
  if (!/^\d{2}-\d{2}-\d{4}$/.test(value)) {
    return "";
  }

  const [day, month, year] = value.split("-").map(Number);

  if (year < 1 || month < 1 || month > 12 || day < 1 || day > 31) {
    return "";
  }

  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return "";
  }

  return `${String(year).padStart(4, "0")}-${String(month).padStart(
    2,
    "0",
  )}-${String(day).padStart(2, "0")}`;
}

function getTodayDisplayDate(): string {
  const today = new Date();

  const day = String(today.getDate()).padStart(2, "0");
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const year = String(today.getFullYear()).padStart(4, "0");

  return `${day}-${month}-${year}`;
}

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
  const [paymentDateInput, setPaymentDateInput] = useState(
    getTodayDisplayDate,
  );
  const [paymentMethod, setPaymentMethod] = useState("");
  const [paymentReference, setPaymentReference] = useState("");
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);

  const isSubmittingRef = useRef(false);

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
      catalogQuery.data?.items.find(
        (invoice) => invoice.id === purchaseInvoiceId,
      ) ?? null,
    [catalogQuery.data?.items, purchaseInvoiceId],
  );

  const maxPaymentMinor = selectedInvoice?.balanceDueMinor ?? 0;
  const amountMinor = parseRupeeInputToMinor(amount);

  // Keep the displayed date in DD-MM-YYYY format, but send ISO to the API.
  const paymentDate = toISODate(paymentDateInput);

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
    });

    if (dateError) {
      errors.push(
        paymentDateInput.trim()
          ? "Enter a valid payment date in DD-MM-YYYY format."
          : dateError,
      );
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
    paymentDateInput,
    paymentMethod,
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

      void queryClient.invalidateQueries({
        queryKey: ["finance-vendor-payments"],
      });

      void queryClient.invalidateQueries({
        queryKey: ["finance-invoices"],
      });

      void queryClient.invalidateQueries({
        queryKey: ["finance-invoice-detail"],
      });

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

  const dateInputBaseClass = `${controlBaseClass} pr-11`;

  const controlBorderClass = (hasError: boolean) =>
    mergeFormControlBorderClass(hasError, controlBaseClass);

  const dateInputBorderClass = (hasError: boolean) =>
    mergeFormControlBorderClass(hasError, dateInputBaseClass);

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

              {(catalogQuery.data?.items ?? []).map((invoice) => (
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
            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                autoComplete="off"
                placeholder="DD-MM-YYYY"
                maxLength={10}
                className={dateInputBorderClass(paymentDateInvalid)}
                value={paymentDateInput}
                onChange={(event) => {
                  setPaymentDateInput(
                    sanitizeDDMMYYYYInput(event.target.value),
                  );
                }}
                disabled={recordMutation.isPending}
                aria-invalid={hasAttemptedSubmit && !paymentDate}
              />

              {/* Calendar icon and native date picker */}
              <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                <label
                  className={`relative flex items-center ${recordMutation.isPending
                    ? "cursor-not-allowed opacity-50"
                    : "cursor-pointer"
                    }`}
                  aria-label="Choose payment date"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.8}
                    className="h-5 w-5 text-slate-500"
                    aria-hidden="true"
                  >
                    <rect x="3" y="5" width="18" height="16" rx="2" />
                    <path d="M16 3v4M8 3v4M3 10h18" />
                  </svg>

                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(event) => {
                      const value = event.target.value;

                      if (value) {
                        const [year, month, day] = value.split("-");
                        setPaymentDateInput(`${day}-${month}-${year}`);
                      } else {
                        setPaymentDateInput("");
                      }
                    }}
                    disabled={recordMutation.isPending}
                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                    aria-label="Choose payment date"
                  />
                </label>
              </div>
            </div>

            {paymentDateInvalid ? (
              <FormFieldInlineError
                message={
                  paymentDateInput.trim()
                    ? "Enter a valid payment date in DD-MM-YYYY format."
                    : "Payment date is required."
                }
              />
            ) : (
              <span className="text-xs font-normal text-slate-500">
                Enter the date as DD-MM-YYYY or select it from the calendar.
              </span>
            )}
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
