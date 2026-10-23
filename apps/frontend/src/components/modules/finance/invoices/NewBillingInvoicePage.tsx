
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";

import OrganizationFormLayout from "@/components/common/OrganizationFormLayout";
import Button from "@/components/ui/GrubpacButton";
import { RestrictedInput } from "@/components/ui/RestrictedInput";
import {
  FormFieldInlineError,
  mergeFormControlBorderClass,
} from "@/components/ui/form-field-inline-error";
import { useAuth } from "@/providers/auth-provider";
import {
  fetchOrganisationClientByIdApi,
  fetchOrganisationClientsApi,
} from "@/lib/api/organisation/clients";
import { fetchLeaseContractsList } from "@/lib/api/lease-contracts";
import {
  createBillingInvoiceApi,
  fetchFinanceInvoiceDetailApi,
  updateFinanceInvoiceApi,
} from "@/lib/api/finance/invoices";
import {
  formatRupeeInputDisplay,
  INR_RUPEE_INPUT_PLACEHOLDER,
  parseRupeeInputToMinor,
} from "@/lib/format/money-format";
import {
  financeInvoiceDetailHref,
  financeInvoiceNewTypeHref,
  financeInvoicesListHref,
} from "@/lib/navigation/finance-static-routes";
import { FINANCE_INVOICE_INPUT_LIMITS } from "@/lib/forms/restricted-input";
import {
  FINANCE_INVOICE_SAVE_ERROR,
  showApiErrorToast,
  showFinanceInvoiceCreatedToast,
  showFinanceInvoiceUpdatedToast,
} from "@/lib/toast/show-toast";

const BILLABLE_RAW_STATUSES = new Set([
  "active",
  "awaiting_assets",
  "approved",
  "billing_paused",
]);

type InvoiceValidationErrors = {
  clientId?: string;
  leaseContractId?: string;
  billingPeriod?: string;
  amount?: string;
  invoiceDate?: string;
};

export default function NewBillingInvoicePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editInvoiceId = searchParams.get("invoiceId")?.trim() || null;

  const { token, organizationId, isLoading: authLoading, permissions } =
    useAuth();

  const canCreate =
    permissions.has("finance.create") || permissions.has("finance.manage");
  const canUpdate =
    permissions.has("finance.update") || permissions.has("finance.manage");

  const [clientId, setClientId] = useState("");
  const [leaseContractId, setLeaseContractId] = useState("");
  const [billingPeriod, setBillingPeriod] = useState("");
  const [amount, setAmount] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [notes, setNotes] = useState("");
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);

  // Prevent duplicate submissions, including rapid repeated clicks.
  const isSubmittingRef = useRef(false);

  const catalogEnabled = !!token && !!organizationId && !authLoading;

  const editQuery = useQuery({
    queryKey: ["finance-invoice-edit-billing", organizationId, editInvoiceId],
    queryFn: () =>
      fetchFinanceInvoiceDetailApi(token!, organizationId!, editInvoiceId!),
    enabled: catalogEnabled && !!editInvoiceId,
  });

  useEffect(() => {
    const data = editQuery.data;

    if (!data || data.invoiceType !== "billing") return;

    if (data.clientId) setClientId(data.clientId);
    if (data.leaseContractId) setLeaseContractId(data.leaseContractId);

    setBillingPeriod(data.billingPeriod ?? "");
    setAmount(
      formatRupeeInputDisplay(String(data.totalAmountMinor / 100)),
    );
    setInvoiceDate(data.invoiceDate);
    setNotes(data.notes ?? "");
  }, [editQuery.data]);

  const clientsQuery = useQuery({
    queryKey: ["finance-billing-clients", organizationId],
    queryFn: () =>
      fetchOrganisationClientsApi(token!, {
        organizationId: organizationId!,
        page: 1,
        pageSize: 50,
        status: "active",
      }),
    enabled: catalogEnabled,
  });

  const clientDetailQuery = useQuery({
    queryKey: ["finance-billing-client-detail", organizationId, clientId],
    queryFn: () =>
      fetchOrganisationClientByIdApi(token!, organizationId!, clientId),
    enabled: catalogEnabled && !!clientId,
  });

  const contractsQuery = useQuery({
    queryKey: ["finance-billing-contracts", organizationId],
    queryFn: () =>
      fetchLeaseContractsList(token!, organizationId!, {
        page: 1,
        pageSize: 50,
        statusFilter: "active",
      }),
    enabled: catalogEnabled,
  });

  const fleetClientId =
    clientDetailQuery.data?.linkedFleetClientId ?? null;

  const contractOptions = useMemo(() => {
    const items = contractsQuery.data?.items ?? [];

    return items.filter(
      (contract) =>
        BILLABLE_RAW_STATUSES.has(contract.rawStatus) &&
        (!fleetClientId || contract.clientId === fleetClientId),
    );
  }, [contractsQuery.data, fleetClientId]);

  useEffect(() => {
    if (
      leaseContractId &&
      !contractOptions.some((contract) => contract.id === leaseContractId)
    ) {
      setLeaseContractId("");
    }
  }, [contractOptions, leaseContractId]);

  const validateForm = (): InvoiceValidationErrors => {
    const errors: InvoiceValidationErrors = {};
    const parsedAmount = parseRupeeInputToMinor(amount);

    if (!clientId.trim()) {
      errors.clientId = "Please select a client.";
    }

    if (!leaseContractId.trim()) {
      errors.leaseContractId = "Please select a lease contract.";
    }

    if (!billingPeriod.trim()) {
      errors.billingPeriod = "Please enter the billing period.";
    }

    if (!amount.trim()) {
      errors.amount = "Please enter the invoice amount.";
    } else if (parsedAmount == null) {
      errors.amount = "Please enter a valid invoice amount.";
    } else if (parsedAmount <= 0) {
      errors.amount = "Invoice amount must be greater than zero.";
    }

    if (!invoiceDate) {
      errors.invoiceDate = "Please select the invoice date.";
    }

    return errors;
  };

  const liveErrors = useMemo(
    () => validateForm(),
    [clientId, leaseContractId, billingPeriod, amount, invoiceDate],
  );

  const displayedErrors: InvoiceValidationErrors = hasAttemptedSubmit
    ? liveErrors
    : {};

  const validationSummary = Object.values(displayedErrors).filter(
    (error): error is string => Boolean(error),
  );

  const isFormValid = Object.keys(liveErrors).length === 0;

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!token || !organizationId) {
        throw new Error("Not authenticated");
      }

      const totalAmountMinor = parseRupeeInputToMinor(amount);

      if (totalAmountMinor == null || totalAmountMinor <= 0) {
        throw new Error("Invalid amount");
      }

      if (editInvoiceId) {
        return updateFinanceInvoiceApi(
          token,
          organizationId,
          editInvoiceId,
          {
            organizationId,
            totalAmountMinor,
            invoiceDate,
            notes: notes.trim() || undefined,
            billingPeriod: billingPeriod.trim(),
          },
        );
      }

      return createBillingInvoiceApi(token, organizationId, {
        organizationId,
        clientId,
        leaseContractId,
        billingPeriod: billingPeriod.trim(),
        totalAmountMinor,
        invoiceDate,
        notes: notes.trim() || undefined,
      });
    },

    onSuccess: (detail) => {
      if (editInvoiceId) {
        showFinanceInvoiceUpdatedToast(detail.invoiceNumber);
        router.push(financeInvoiceDetailHref(detail.id));
      } else {
        showFinanceInvoiceCreatedToast(detail.invoiceNumber);
        router.push(financeInvoicesListHref);
      }
    },

    onError: (error) => {
      showApiErrorToast(error, FINANCE_INVOICE_SAVE_ERROR);
    },

    onSettled: () => {
      isSubmittingRef.current = false;
    },
  });

  const isEdit = !!editInvoiceId;
  const canSave = isEdit ? canUpdate : canCreate;

  const canSubmit =
    canSave &&
    !saveMutation.isPending &&
    !editQuery.isLoading &&
    isFormValid;

  const handleSave = () => {
    setHasAttemptedSubmit(true);

    // Do not submit if any required field is invalid.
    if (!isFormValid) return;

    // Protect against rapid repeated clicks.
    if (isSubmittingRef.current || saveMutation.isPending) return;

    isSubmittingRef.current = true;
    saveMutation.mutate();
  };

  const clients = clientsQuery.data?.items ?? [];

  const isLoading =
    clientsQuery.isLoading ||
    contractsQuery.isLoading ||
    editQuery.isLoading;

  const controlBaseClass =
    "w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-200";

  const selectBaseClass =
    "w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-200";

  const fieldBorderClass = (hasError: boolean) =>
    mergeFormControlBorderClass(hasError, controlBaseClass);

  const selectBorderClass = (hasError: boolean) =>
    mergeFormControlBorderClass(hasError, selectBaseClass);

  if (!canSave && !authLoading) {
    return (
      <OrganizationFormLayout
        title={isEdit ? "Edit billing invoice" : "Add billing invoice"}
        backLink={{
          label: "Back",
          href: financeInvoiceNewTypeHref,
        }}
      >
        <p className="text-sm text-slate-600">
          You do not have permission to {isEdit ? "edit" : "create"} invoices.
        </p>
      </OrganizationFormLayout>
    );
  }

  return (
    <OrganizationFormLayout
      title={isEdit ? "Edit billing invoice" : "Add billing invoice"}
      description="Bill a client for lease contract charges."
      backLink={{
        label: "Back",
        href: isEdit
          ? financeInvoiceDetailHref(editInvoiceId!)
          : financeInvoiceNewTypeHref,
      }}
      infoText="Invoice number is assigned automatically (BINV-YYYY-####)."
      contentVariant="form-card"
      actions={
        <div className="flex flex-col gap-3">
          {hasAttemptedSubmit && validationSummary.length > 0 && (
            <div
              className="rounded-md border border-red-200 bg-red-50 px-3 py-2"
              role="alert"
            >
              <p className="text-sm font-medium text-red-700">
                Please fix the following before saving:
              </p>
              <ul className="mt-1 list-disc pl-5 text-sm text-red-600">
                {validationSummary.map((message) => (
                  <li key={message}>{message}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() =>
                router.push(
                  isEdit
                    ? financeInvoiceDetailHref(editInvoiceId!)
                    : financeInvoicesListHref,
                )
              }
              disabled={saveMutation.isPending}
            >
              Cancel
            </Button>

            <Button
              type="button"
              disabled={!canSubmit}
              onClick={handleSave}
            >
              {saveMutation.isPending ? "Saving…" : "Save invoice"}
            </Button>
          </div>
        </div>
      }
    >
      {isLoading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : (
        <div className="space-y-4">
          <div>
            <label
              htmlFor="billing-client"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Client *
            </label>

            <select
              id="billing-client"
              className={selectBorderClass(!!displayedErrors.clientId)}
              value={clientId}
              onChange={(event) => {
                setClientId(event.target.value);
                setLeaseContractId("");
              }}
              disabled={isEdit || clients.length === 0}
              aria-invalid={!!displayedErrors.clientId}
              aria-describedby={
                displayedErrors.clientId ? "billing-client-error" : undefined
              }
            >
              <option value="">Select client</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.clientName}
                </option>
              ))}
            </select>

            {displayedErrors.clientId && (
              <div id="billing-client-error">
                <FormFieldInlineError message={displayedErrors.clientId} />
              </div>
            )}
          </div>

          <div>
            <label
              htmlFor="billing-contract"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Lease contract *
            </label>

            <select
              id="billing-contract"
              className={selectBorderClass(!!displayedErrors.leaseContractId)}
              value={leaseContractId}
              onChange={(event) => setLeaseContractId(event.target.value)}
              disabled={
                isEdit ||
                !clientId ||
                contractOptions.length === 0
              }
              aria-invalid={!!displayedErrors.leaseContractId}
              aria-describedby={
                displayedErrors.leaseContractId
                  ? "billing-contract-error"
                  : undefined
              }
            >
              <option value="">Select contract</option>
              {contractOptions.map((contract) => (
                <option key={contract.id} value={contract.id}>
                  {contract.contractNumber} — {contract.clientName}
                </option>
              ))}
            </select>

            {displayedErrors.leaseContractId && (
              <div id="billing-contract-error">
                <FormFieldInlineError message={displayedErrors.leaseContractId} />
              </div>
            )}

            {clientId &&
              !fleetClientId &&
              !clientDetailQuery.isLoading ? (
              <p className="mt-1 text-xs text-amber-700">
                Client is not linked to fleet leasing yet; billing cannot be
                created until the link exists.
              </p>
            ) : null}
          </div>

          <div>
            <label
              htmlFor="billing-period"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Billing period *
            </label>

            <RestrictedInput
              restrictedKind="text"
              value={billingPeriod}
              onChange={setBillingPeriod}
              maxLength={FINANCE_INVOICE_INPUT_LIMITS.billingPeriod}
              placeholder="e.g. April 2026"
              className={fieldBorderClass(!!displayedErrors.billingPeriod)}
              aria-invalid={!!displayedErrors.billingPeriod}
            />

            <FormFieldInlineError message={displayedErrors.billingPeriod} />
          </div>

          <div>
            <label
              htmlFor="billing-amount"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Amount (₹) *
            </label>

            <RestrictedInput
              restrictedKind="inrRupee"
              value={amount}
              onChange={setAmount}
              placeholder={INR_RUPEE_INPUT_PLACEHOLDER}
              className={fieldBorderClass(!!displayedErrors.amount)}
              aria-invalid={!!displayedErrors.amount}
            />

            <FormFieldInlineError message={displayedErrors.amount} />
          </div>

          <div>
            <label
              htmlFor="billing-invoice-date"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Invoice date *
            </label>

            <input
              id="billing-invoice-date"
              type="date"
              className={fieldBorderClass(!!displayedErrors.invoiceDate)}
              value={invoiceDate}
              onChange={(event) => setInvoiceDate(event.target.value)}
              aria-invalid={!!displayedErrors.invoiceDate}
              aria-describedby={
                displayedErrors.invoiceDate
                  ? "billing-invoice-date-error"
                  : undefined
              }
            />

            {displayedErrors.invoiceDate && (
              <div id="billing-invoice-date-error">
                <FormFieldInlineError message={displayedErrors.invoiceDate} />
              </div>
            )}
          </div>

          <div>
            <label
              htmlFor="billing-notes"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Notes (optional)
            </label>

            <RestrictedInput
              restrictedKind="text"
              value={notes}
              onChange={setNotes}
              maxLength={FINANCE_INVOICE_INPUT_LIMITS.invoiceNotes}
            />
          </div>
        </div>
      )}
    </OrganizationFormLayout>
  );
}
