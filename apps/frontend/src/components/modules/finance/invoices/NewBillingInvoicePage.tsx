"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";

import OrganizationFormLayout from "@/components/common/OrganizationFormLayout";
import Button from "@/components/ui/GrubpacButton";
import { RestrictedInput } from "@/components/ui/RestrictedInput";
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
import { parseRupeeInputToMinor } from "@/lib/format/money-format";
import {
  financeInvoiceDetailHref,
  financeInvoiceNewTypeHref,
  financeInvoicesListHref,
} from "@/lib/navigation/finance-static-routes";
import {
  FINANCE_INVOICE_SAVE_ERROR,
  showErrorToast,
  showFinanceInvoiceCreatedToast,
  showFinanceInvoiceUpdatedToast,
} from "@/lib/toast/show-toast";

const BILLABLE_RAW_STATUSES = new Set([
  "active",
  "awaiting_assets",
  "approved",
  "billing_paused",
]);

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
    setAmount(String(data.totalAmountMinor / 100));
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

  const fleetClientId = clientDetailQuery.data?.linkedFleetClientId ?? null;

  const contractOptions = useMemo(() => {
    const items = contractsQuery.data?.items ?? [];
    return items.filter(
      (c) =>
        BILLABLE_RAW_STATUSES.has(c.rawStatus) &&
        (!fleetClientId || c.clientId === fleetClientId),
    );
  }, [contractsQuery.data, fleetClientId]);

  useEffect(() => {
    if (
      leaseContractId &&
      !contractOptions.some((c) => c.id === leaseContractId)
    ) {
      setLeaseContractId("");
    }
  }, [contractOptions, leaseContractId]);

  const isFormValid =
    !!clientId &&
    !!leaseContractId &&
    !!billingPeriod.trim() &&
    parseRupeeInputToMinor(amount) != null &&
    !!invoiceDate;

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!token || !organizationId) throw new Error("Not authenticated");
      const totalAmountMinor = parseRupeeInputToMinor(amount);
      if (totalAmountMinor == null) throw new Error("Invalid amount");
      if (editInvoiceId) {
        return updateFinanceInvoiceApi(token, organizationId, editInvoiceId, {
          organizationId,
          totalAmountMinor,
          invoiceDate,
          notes: notes.trim() || undefined,
          billingPeriod: billingPeriod.trim(),
        });
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
    onError: () => {
      showErrorToast(FINANCE_INVOICE_SAVE_ERROR);
    },
  });

  const isEdit = !!editInvoiceId;
  const canSave = isEdit ? canUpdate : canCreate;
  const canSubmit =
    canSave && isFormValid && !saveMutation.isPending && !editQuery.isLoading;

  const clients = clientsQuery.data?.items ?? [];

  if (!canSave && !authLoading) {
    return (
      <OrganizationFormLayout
        title={isEdit ? "Edit billing invoice" : "Add billing invoice"}
        backLink={{ label: "Back", href: financeInvoiceNewTypeHref }}
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
        <>
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
            onClick={() => saveMutation.mutate()}
          >
            {saveMutation.isPending ? "Saving…" : "Save invoice"}
          </Button>
        </>
      }
    >
      {clientsQuery.isLoading || contractsQuery.isLoading || editQuery.isLoading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Client *
            </label>
            <select
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
              value={clientId}
              onChange={(e) => {
                setClientId(e.target.value);
                setLeaseContractId("");
              }}
              disabled={isEdit || clients.length === 0}
            >
              <option value="">Select client</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.clientName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Lease contract *
            </label>
            <select
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
              value={leaseContractId}
              onChange={(e) => setLeaseContractId(e.target.value)}
              disabled={isEdit || !clientId || contractOptions.length === 0}
            >
              <option value="">Select contract</option>
              {contractOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.contractNumber} — {c.clientName}
                </option>
              ))}
            </select>
            {clientId && !fleetClientId && !clientDetailQuery.isLoading ? (
              <p className="mt-1 text-xs text-amber-700">
                Client is not linked to fleet leasing yet; billing cannot be
                created until the link exists.
              </p>
            ) : null}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Billing period *
            </label>
            <RestrictedInput
              restrictedKind="text"
              value={billingPeriod}
              onChange={setBillingPeriod}
              maxLength={120}
              placeholder="e.g. April 2026"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Amount (₹) *
            </label>
            <RestrictedInput
              restrictedKind="text"
              value={amount}
              onChange={setAmount}
              placeholder="e.g. 50000"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Invoice date *
            </label>
            <input
              type="date"
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Notes (optional)
            </label>
            <RestrictedInput
              restrictedKind="text"
              value={notes}
              onChange={setNotes}
              maxLength={2000}
            />
          </div>
        </div>
      )}
    </OrganizationFormLayout>
  );
}
