"use client";
import { navigateToEntityShell } from "@/lib/navigation/secure-entity-navigation";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useFinanceEntityId } from "@/lib/navigation/use-finance-entity-id";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { invalidateFinanceInvoiceCaches } from "@/lib/query/invalidate-domain-caches";

import OrganizationFormLayout from "@/components/common/OrganizationFormLayout";
import Button from "@/components/ui/GrubpacButton";
import { RestrictedInput } from "@/components/ui/RestrictedInput";
import { localTodayIsoDate } from "@/lib/format/date-format";
import { useAuth } from "@/providers/auth-provider";
import { fetchAllAvailableActiveAssetRegisterVehiclesApi } from "@/lib/api/asset-register/vehicles";
import {
  createSaleInvoiceApi,
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
import { isValidOptionalEmail } from "@/lib/validation/email-validation";
import {
  FINANCE_INVOICE_SAVE_ERROR,
  showApiErrorToast,
  showFinanceInvoiceCreatedToast,
  showFinanceInvoiceUpdatedToast,
} from "@/lib/toast/show-toast";

export default function NewSaleInvoicePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const editInvoiceId = useFinanceEntityId("invoiceId");

  const { token, organizationId, isLoading: authLoading, permissions } =
    useAuth();

  const canCreate =
    permissions.has("finance.create") || permissions.has("finance.manage");
  const canUpdate =
    permissions.has("finance.update") || permissions.has("finance.manage");

  const [vehicleId, setVehicleId] = useState("");
  const [buyerName, setBuyerName] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [saleAmount, setSaleAmount] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [notes, setNotes] = useState("");
  const [requestAutoEmail, setRequestAutoEmail] = useState(false);

  const catalogEnabled = !!token && !!organizationId && !authLoading;

  const editQuery = useQuery({
    queryKey: ["finance-invoice-edit-sale", organizationId, editInvoiceId],
    queryFn: () =>
      fetchFinanceInvoiceDetailApi(token!, organizationId!, editInvoiceId!),
    enabled: catalogEnabled && !!editInvoiceId,
  });

  useEffect(() => {
    const data = editQuery.data;
    if (!data || data.invoiceType !== "sale") return;
    setBuyerName(data.partyName);
    setBuyerEmail(data.partyEmail ?? "");
    setSaleAmount(
      formatRupeeInputDisplay(String(data.totalAmountMinor / 100)),
    );
    setInvoiceDate(data.invoiceDate);
    setNotes(data.notes ?? "");
    if (data.vehicleId) setVehicleId(data.vehicleId);
  }, [editQuery.data]);

  const vehiclesQuery = useQuery({
    queryKey: ["finance-sale-vehicles", organizationId],
    queryFn: () =>
      fetchAllAvailableActiveAssetRegisterVehiclesApi({
        token: token!,
        organizationId: organizationId!,
      }),
    enabled: catalogEnabled && !editInvoiceId,
  });

  const vehicles = vehiclesQuery.data ?? [];

  const vehicleOptions = useMemo(() => {
    if (editInvoiceId && editQuery.data?.vehicleId && editQuery.data.vehicleLabel) {
      return [
        {
          id: editQuery.data.vehicleId,
          label: editQuery.data.vehicleLabel,
        },
      ];
    }
    return vehicles.map((v) => ({
      id: v.id,
      label: `${v.fleetCode} — ${v.assetClassName} (Available)`,
    }));
  }, [vehicles, editInvoiceId, editQuery.data]);

  const emailValid = isValidOptionalEmail(buyerEmail);

  const isFormValid =
    !!vehicleId &&
    !!buyerName.trim() &&
    emailValid &&
    parseRupeeInputToMinor(saleAmount) != null &&
    !!invoiceDate;

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!token || !organizationId) throw new Error("Not authenticated");
      const totalAmountMinor = parseRupeeInputToMinor(saleAmount);
      if (totalAmountMinor == null) throw new Error("Invalid amount");
      if (editInvoiceId) {
        return updateFinanceInvoiceApi(token, organizationId, editInvoiceId, {
          organizationId,
          partyName: buyerName.trim(),
          partyEmail: buyerEmail.trim() || undefined,
          totalAmountMinor,
          invoiceDate,
          notes: notes.trim() || undefined,
        });
      }
      return createSaleInvoiceApi(token, organizationId, {
        organizationId,
        vehicleId,
        buyerName: buyerName.trim(),
        buyerEmail: buyerEmail.trim() || undefined,
        totalAmountMinor,
        invoiceDate,
        notes: notes.trim() || undefined,
        requestAutoEmail,
      });
    },
    onSuccess: (detail) => {
      void invalidateFinanceInvoiceCaches(queryClient);
      if (editInvoiceId) {
        showFinanceInvoiceUpdatedToast(detail.invoiceNumber);
        navigateToEntityShell(router, financeInvoiceDetailHref(detail.id), detail.id, 'push');
      } else {
        showFinanceInvoiceCreatedToast(detail.invoiceNumber);
        router.push(financeInvoicesListHref);
      }
    },
    onError: (error) => {
      showApiErrorToast(error, FINANCE_INVOICE_SAVE_ERROR);
    },
  });

  const isEdit = !!editInvoiceId;
  const canSave = isEdit ? canUpdate : canCreate;
  const canSubmit =
    canSave && isFormValid && !saveMutation.isPending && !editQuery.isLoading;

  if (!canSave && !authLoading) {
    return (
      <OrganizationFormLayout
        title={isEdit ? "Edit sale invoice" : "Add sale invoice"}
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
      title={isEdit ? "Edit sale invoice" : "Add sale invoice"}
      description="Record a customer sale for an available fleet register vehicle."
      backLink={{
        label: "Back",
        href: isEdit
          ? financeInvoiceDetailHref(editInvoiceId!)
          : financeInvoiceNewTypeHref,
      }}
      infoText={
        isEdit
          ? "Only unpaid sale invoices can be edited."
          : "Invoice number is assigned automatically (SINV-YYYY-####). Auto-email records intent only until outbound mail is wired."
      }
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
      {vehiclesQuery.isLoading || editQuery.isLoading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Vehicle *
            </label>
            <select
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
              value={vehicleId}
              onChange={(e) => setVehicleId(e.target.value)}
              disabled={isEdit || vehicleOptions.length === 0}
            >
              <option value="">Select vehicle</option>
              {vehicleOptions.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Buyer name *
            </label>
            <RestrictedInput
              restrictedKind="name"
              value={buyerName}
              onChange={setBuyerName}
              maxLength={FINANCE_INVOICE_INPUT_LIMITS.saleBuyerName}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Buyer email (optional)
            </label>
            <RestrictedInput
              restrictedKind="email"
              value={buyerEmail}
              onChange={setBuyerEmail}
              maxLength={FINANCE_INVOICE_INPUT_LIMITS.saleBuyerEmail}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Sale amount (₹) *
            </label>
            <RestrictedInput
              restrictedKind="inrRupee"
              value={saleAmount}
              onChange={setSaleAmount}
              placeholder={INR_RUPEE_INPUT_PLACEHOLDER}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Invoice date *
            </label>
            <input
              type="date"
              max={localTodayIsoDate()}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
            />
          </div>

          {!isEdit ? (
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={requestAutoEmail}
                onChange={(e) => setRequestAutoEmail(e.target.checked)}
              />
              Send invoice email to buyer when mail service is available
            </label>
          ) : null}

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
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
