"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";

import OrganizationFormLayout from "@/components/common/OrganizationFormLayout";
import Button from "@/components/ui/GrubpacButton";
import { RestrictedInput } from "@/components/ui/RestrictedInput";
import { useAuth } from "@/providers/auth-provider";
import { fetchOrganisationSuppliersApi } from "@/lib/api/organisation/suppliers";
import { fetchFleetAssetClasses } from "@/lib/api/lease-contracts";
import { fetchInventoryPartsCatalogApi } from "@/lib/api/finance/inventory-parts";
import {
  createPurchaseSparePartsInvoiceApi,
  createPurchaseVehicleInvoiceApi,
} from "@/lib/api/finance/invoices";
import { parseRupeeInputToMinor } from "@/lib/format/money-format";
import {
  financeInvoiceNewTypeHref,
  financeInvoicesListHref,
} from "@/lib/navigation/finance-static-routes";
import { PURCHASE_INVOICE_NUMBER_FORMAT_HINT } from "@/lib/finance/invoice-filter-options";
import {
  FINANCE_INVOICE_SAVE_ERROR,
  showErrorToast,
  showFinanceInvoiceCreatedToast,
} from "@/lib/toast/show-toast";

type PurchaseTab = "vehicle" | "spare_parts";

export default function NewPurchaseInvoicePage() {
  const router = useRouter();
  const { token, organizationId, isLoading: authLoading, permissions } =
    useAuth();

  const canCreate =
    permissions.has("finance.create") || permissions.has("finance.manage");

  const [tab, setTab] = useState<PurchaseTab>("vehicle");
  const [supplierId, setSupplierId] = useState("");
  const [assetClassName, setAssetClassName] = useState("");
  const [vehicleAmount, setVehicleAmount] = useState("");
  const [partId, setPartId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unitCost, setUnitCost] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [batchLot, setBatchLot] = useState("");
  const [notes, setNotes] = useState("");

  const catalogEnabled = !!token && !!organizationId && !authLoading;

  const suppliersQuery = useQuery({
    queryKey: ["finance-invoice-suppliers", organizationId],
    queryFn: () =>
      fetchOrganisationSuppliersApi(token!, {
        organizationId: organizationId!,
        page: 1,
        pageSize: 50,
        status: "active",
      }),
    enabled: catalogEnabled,
  });

  const assetClassesQuery = useQuery({
    queryKey: ["finance-invoice-asset-classes", organizationId],
    queryFn: () => fetchFleetAssetClasses(token!, organizationId!),
    enabled: catalogEnabled && tab === "vehicle",
  });

  const partsQuery = useQuery({
    queryKey: ["finance-invoice-parts", organizationId],
    queryFn: () =>
      fetchInventoryPartsCatalogApi(token!, organizationId!, {
        page: 1,
        pageSize: 100,
      }),
    enabled: catalogEnabled && tab === "spare_parts",
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!token || !organizationId) throw new Error("Not authenticated");
      if (tab === "vehicle") {
        const totalAmountMinor = parseRupeeInputToMinor(vehicleAmount);
        if (totalAmountMinor == null) throw new Error("Invalid amount");
        return createPurchaseVehicleInvoiceApi(token, organizationId, {
          organizationId,
          supplierId,
          assetClassName,
          totalAmountMinor,
          invoiceDate,
          notes: notes.trim() || undefined,
        });
      }
      const unitCostMinor = parseRupeeInputToMinor(unitCost);
      const qty = Number(quantity);
      if (unitCostMinor == null || !Number.isInteger(qty) || qty < 1) {
        throw new Error("Invalid spare parts line");
      }
      return createPurchaseSparePartsInvoiceApi(token, organizationId, {
        organizationId,
        supplierId,
        inventoryPartId: partId,
        quantity: qty,
        unitCostMinor,
        invoiceDate,
        batchLot: batchLot.trim() || undefined,
        notes: notes.trim() || undefined,
      });
    },
    onSuccess: (detail) => {
      showFinanceInvoiceCreatedToast(detail.invoiceNumber);
      router.push(financeInvoicesListHref);
    },
    onError: () => {
      showErrorToast(FINANCE_INVOICE_SAVE_ERROR);
    },
  });

  const isVehicleValid =
    !!supplierId &&
    !!assetClassName.trim() &&
    parseRupeeInputToMinor(vehicleAmount) != null &&
    !!invoiceDate;

  const isSpareValid =
    !!supplierId &&
    !!partId &&
    Number(quantity) >= 1 &&
    parseRupeeInputToMinor(unitCost) != null &&
    !!invoiceDate;

  const canSubmit =
    canCreate &&
    !createMutation.isPending &&
    (tab === "vehicle" ? isVehicleValid : isSpareValid);

  const infoBanner =
    tab === "vehicle"
      ? `Invoice number is assigned automatically (${PURCHASE_INVOICE_NUMBER_FORMAT_HINT}). Vehicle rows reference asset class until Asset Management receipt is linked.`
      : "Stock is not received on this screen — inventory stock receipt will reference this invoice later.";

  const suppliers = suppliersQuery.data?.items ?? [];
  const assetClasses = assetClassesQuery.data?.items ?? [];
  const parts = partsQuery.data?.items ?? [];

  const loadingCatalog =
    suppliersQuery.isLoading ||
    (tab === "vehicle" && assetClassesQuery.isLoading) ||
    (tab === "spare_parts" && partsQuery.isLoading);

  const tabButtons = useMemo(
    () => (
      <div className="mb-6 flex gap-2 border-b border-slate-200 pb-2">
        {(
          [
            ["vehicle", "Vehicle"],
            ["spare_parts", "Spare Parts"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              tab === value
                ? "bg-[#FE5720] text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    ),
    [tab],
  );

  if (!canCreate && !authLoading) {
    return (
      <OrganizationFormLayout
        title="Add purchase invoice"
        backLink={{ label: "Back", href: financeInvoiceNewTypeHref }}
      >
        <p className="text-sm text-slate-600">
          You do not have permission to create invoices.
        </p>
      </OrganizationFormLayout>
    );
  }

  return (
    <OrganizationFormLayout
      title="Add purchase invoice"
      description="Record a vendor bill for vehicles or spare parts."
      backLink={{ label: "Back", href: financeInvoiceNewTypeHref }}
      infoText={infoBanner}
      contentVariant="form-card"
      actions={
        <>
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.push(financeInvoicesListHref)}
            disabled={createMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!canSubmit}
            onClick={() => createMutation.mutate()}
          >
            {createMutation.isPending ? "Saving…" : "Save invoice"}
          </Button>
        </>
      }
    >
      {tabButtons}

      {loadingCatalog ? (
        <p className="text-sm text-slate-500">Loading catalogs…</p>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Vendor *
            </label>
            <select
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              disabled={suppliers.length === 0}
            >
              <option value="">Select supplier</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            {suppliers.length === 0 ? (
              <p className="mt-1 text-xs text-slate-500">
                No active suppliers in this organization. Add a supplier under
                Organisation before creating a purchase invoice.
              </p>
            ) : null}
          </div>

          {tab === "vehicle" ? (
            <>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Asset class *
                </label>
                <select
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                  value={assetClassName}
                  onChange={(e) => setAssetClassName(e.target.value)}
                  disabled={assetClasses.length === 0}
                >
                  <option value="">Select asset class</option>
                  {assetClasses.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
                {assetClasses.length === 0 ? (
                  <p className="mt-1 text-xs text-slate-500">
                    No asset classes available. Define asset classes in Asset
                    Register before recording a vehicle purchase invoice.
                  </p>
                ) : null}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Amount (₹) *
                </label>
                <RestrictedInput
                  restrictedKind="text"
                  value={vehicleAmount}
                  onChange={setVehicleAmount}
                  placeholder="e.g. 25000"
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Part *
                </label>
                <select
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                  value={partId}
                  onChange={(e) => setPartId(e.target.value)}
                  disabled={parts.length === 0}
                >
                  <option value="">Select part</option>
                  {parts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                      {p.partCode ? ` (${p.partCode})` : ""}
                    </option>
                  ))}
                </select>
                {parts.length === 0 ? (
                  <p className="mt-1 text-xs text-slate-500">
                    No inventory parts in the catalog yet. Add parts in Finance
                    inventory before creating a spare parts purchase invoice.
                  </p>
                ) : null}
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Quantity *
                  </label>
                  <RestrictedInput
                    restrictedKind="digits"
                    value={quantity}
                    onChange={setQuantity}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Unit cost (₹) *
                  </label>
                  <RestrictedInput
                    restrictedKind="text"
                    value={unitCost}
                    onChange={setUnitCost}
                    placeholder="e.g. 500"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Batch / lot (optional)
                </label>
                <RestrictedInput
                  restrictedKind="text"
                  value={batchLot}
                  onChange={setBatchLot}
                  maxLength={120}
                />
              </div>
            </>
          )}

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
