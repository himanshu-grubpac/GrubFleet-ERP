"use client";
import FormActions from "@/components/common/FormActions";
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";

import OrganizationFormLayout from "@/components/common/OrganizationFormLayout";
import Button from "@/components/ui/GrubpacButton";
import { RestrictedInput } from "@/components/ui/RestrictedInput";
import { useAuth } from "@/providers/auth-provider";
import { fetchOrganisationSuppliersApi } from "@/lib/api/organisation/suppliers";
import { fetchInventoryPartsCatalogApi } from "@/lib/api/finance/inventory-parts";
import {
  createPurchaseSparePartsInvoiceApi,
  createPurchaseVehicleInvoiceApi,
  fetchFinancePurchaseAssetClassesCatalogApi,
} from "@/lib/api/finance/invoices";
import {
  formatInrFromMinor,
  INR_RUPEE_INPUT_PLACEHOLDER,
  parseRupeeInputToMinor,
} from "@/lib/format/money-format";
import {
  computePurchaseVehicleLineTax,
  type FinancePurchaseTaxMode,
} from "@/lib/finance/purchase-vehicle-line-tax";
import { financeInvoicesListHref } from "@/lib/navigation/finance-static-routes";
import {
  FINANCE_INVOICE_BATCH_LOT_PLACEHOLDER,
  FINANCE_INVOICE_QUANTITY_PLACEHOLDER,
  FINANCE_INVOICE_SPARE_NOTES_PLACEHOLDER,
  FINANCE_INVOICE_VAT_PERCENT_PLACEHOLDER,
} from "@/lib/finance/finance-invoice-form-placeholders";
import { PURCHASE_INVOICE_NUMBER_FORMAT_HINT } from "@/lib/finance/invoice-filter-options";
import {
  FINANCE_INVOICE_SAVE_ERROR,
  showErrorToast,
  showFinanceInvoiceCreatedToast,
} from "@/lib/toast/show-toast";

type PurchaseTab = "vehicle" | "spare_parts";

type VehicleLineForm = {
  key: string;
  assetClassId: string;
  quantity: string;
  rate: string;
  taxMode: "" | FinancePurchaseTaxMode;
  vatPercent: string;
};



function createEmptyVehicleLine(): VehicleLineForm {
  return {
    key: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    assetClassId: "",
    quantity: "",
    rate: "",
    taxMode: "",
    vatPercent: "",
  };
}

function parseVatPercent(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!/^\d+$/.test(trimmed)) return null;
  const n = Number(trimmed);
  if (!Number.isInteger(n) || n < 0 || n > 100) return null;
  return n;
}

export default function NewPurchaseInvoicePage() {
  const router = useRouter();
  const { token, organizationId, isLoading: authLoading, permissions } =
    useAuth();

  const canCreate =
    permissions.has("finance.create") || permissions.has("finance.manage");

  const [tab, setTab] = useState<PurchaseTab>("vehicle");
  const [supplierId, setSupplierId] = useState("");
  const [vehicleLines, setVehicleLines] = useState<VehicleLineForm[]>(() => [
    createEmptyVehicleLine(),
  ]);
  const [partId, setPartId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [batchLot, setBatchLot] = useState("");
  const [spareNotes, setSpareNotes] = useState("");
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const isSubmittingRef = useRef(false);

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
    queryFn: () =>
      fetchFinancePurchaseAssetClassesCatalogApi(token!, {
        organizationId: organizationId!,
        page: 1,
        pageSize: 50,
        status: "active",
      }),
    enabled: catalogEnabled && tab === "vehicle",
  });

  const partsQuery = useQuery({
    queryKey: ["finance-invoice-parts", organizationId],
    queryFn: () =>
      fetchInventoryPartsCatalogApi(token!, organizationId!, {
        page: 1,
        pageSize: 50,
      }),
    enabled: catalogEnabled && tab === "spare_parts",
  });

  const vehicleLineBreakdowns = useMemo(() => {
    return vehicleLines.map((line) => {
      const rateMinor = parseRupeeInputToMinor(line.rate);
      const qty = Number(line.quantity);
      const vatPercent = parseVatPercent(line.vatPercent);
      if (
        !line.assetClassId ||
        rateMinor == null ||
        !Number.isInteger(qty) ||
        qty < 1 ||
        !line.taxMode ||
        vatPercent == null
      ) {
        return null;
      }
      return computePurchaseVehicleLineTax(
        qty,
        rateMinor,
        line.taxMode,
        vatPercent,
      );
    });
  }, [vehicleLines]);

  const vehicleGrandTotalMinor = useMemo(() => {
    let sum = 0;
    for (const breakdown of vehicleLineBreakdowns) {
      if (!breakdown) return null;
      sum += breakdown.lineTotalMinor;
      if (!Number.isSafeInteger(sum)) return null;
    }
    return sum > 0 ? sum : null;
  }, [vehicleLineBreakdowns]);

  const vehicleInvoiceSummary = useMemo(() => {
    type SummaryLine = {
      key: string;
      title: string;
      taxHint: string;
      baseAmountMinor: number;
      taxAmountMinor: number;
      lineTotalMinor: number;
    };

    const lines: SummaryLine[] = [];
    const vatGroupMap = new Map<
      string,
      {
        vatPercent: number;
        taxMode: FinancePurchaseTaxMode;
        taxAmountMinor: number;
      }
    >();

    vehicleLines.forEach((line, index) => {
      const breakdown = vehicleLineBreakdowns[index];
      const vatPercent = parseVatPercent(line.vatPercent);
      if (
        !breakdown ||
        !line.assetClassId ||
        !line.taxMode ||
        vatPercent == null
      ) {
        return;
      }

      const catalogItems = assetClassesQuery.data?.items ?? [];
      const assetClass = catalogItems.find((c) => c.id === line.assetClassId);
      const assetLabel =
        assetClass?.specLabel || assetClass?.name || "Asset class";
      const taxModeLabel =
        line.taxMode === "INCLUSIVE" ? "Inclusive" : "Exclusive";

      lines.push({
        key: line.key,
        title: `Asset line ${index + 1} — ${assetLabel}`,
        taxHint: `${taxModeLabel} tax · VAT ${vatPercent}%`,
        baseAmountMinor: breakdown.baseAmountMinor,
        taxAmountMinor: breakdown.taxAmountMinor,
        lineTotalMinor: breakdown.lineTotalMinor,
      });

      const groupKey = `${line.taxMode}-${vatPercent}`;
      const existing = vatGroupMap.get(groupKey);
      if (existing) {
        existing.taxAmountMinor += breakdown.taxAmountMinor;
      } else {
        vatGroupMap.set(groupKey, {
          vatPercent,
          taxMode: line.taxMode,
          taxAmountMinor: breakdown.taxAmountMinor,
        });
      }
    });

    let totalBaseMinor = 0;
    let totalTaxMinor = 0;
    let totalGrandMinor = 0;
    for (const row of lines) {
      totalBaseMinor += row.baseAmountMinor;
      totalTaxMinor += row.taxAmountMinor;
      totalGrandMinor += row.lineTotalMinor;
      if (
        !Number.isSafeInteger(totalBaseMinor) ||
        !Number.isSafeInteger(totalTaxMinor) ||
        !Number.isSafeInteger(totalGrandMinor)
      ) {
        return {
          lines: [],
          vatGroups: [],
          totalBaseMinor: null,
          totalTaxMinor: null,
          totalGrandMinor: null,
          allLinesComplete: vehicleLineBreakdowns.every((b) => b != null),
        };
      }
    }

    const vatGroups = Array.from(vatGroupMap.values()).sort(
      (a, b) =>
        a.vatPercent - b.vatPercent ||
        a.taxMode.localeCompare(b.taxMode),
    );

    return {
      lines,
      vatGroups,
      totalBaseMinor: lines.length > 0 ? totalBaseMinor : null,
      totalTaxMinor: lines.length > 0 ? totalTaxMinor : null,
      totalGrandMinor: lines.length > 0 ? totalGrandMinor : null,
      allLinesComplete: vehicleLineBreakdowns.every((b) => b != null),
    };
  }, [vehicleLines, vehicleLineBreakdowns, assetClassesQuery.data]);

  const vehicleValidationErrors = useMemo(() => {
    const errors: string[] = [];

    if (!supplierId) errors.push("Vehicle: select a vendor.");
    if (!invoiceDate) errors.push("Vehicle: select an invoice date.");
    if (vehicleLines.length === 0) errors.push("Add at least one asset line.");

    vehicleLines.forEach((line, index) => {
      const lineNumber = index + 1;
      const qty = Number(line.quantity);
      const rateMinor = parseRupeeInputToMinor(line.rate);
      const vatPercent = parseVatPercent(line.vatPercent);

      if (!line.assetClassId) errors.push(`Asset line ${lineNumber}: select an asset class.`);
      if (!line.quantity.trim()) {
        errors.push(`Asset line ${lineNumber}: enter a quantity.`);
      } else if (!Number.isInteger(qty) || qty < 1) {
        errors.push(`Asset line ${lineNumber}: quantity must be a whole number of at least 1.`);
      }
      if (!line.rate.trim()) {
        errors.push(`Asset line ${lineNumber}: enter a rate.`);
      } else if (rateMinor == null || rateMinor <= 0) {
        errors.push(`Asset line ${lineNumber}: enter a valid rate greater than zero.`);
      }
      if (!line.taxMode) errors.push(`Asset line ${lineNumber}: select a tax treatment.`);
      if (line.taxMode) {
        if (!line.vatPercent.trim()) {
          errors.push(`Asset line ${lineNumber}: enter the VAT percentage.`);
        } else if (vatPercent == null) {
          errors.push(`Asset line ${lineNumber}: VAT must be a whole number between 0 and 100.`);
        }
      }
    });

    if (vehicleGrandTotalMinor == null && vehicleLines.every((line) => {
      const qty = Number(line.quantity);
      const rateMinor = parseRupeeInputToMinor(line.rate);
      const vatPercent = parseVatPercent(line.vatPercent);
      return !!line.assetClassId && Number.isInteger(qty) && qty >= 1 && rateMinor != null && rateMinor > 0 && !!line.taxMode && vatPercent != null;
    })) {
      errors.push("The invoice total is invalid or exceeds the supported amount.");
    }

    return errors;
  }, [supplierId, invoiceDate, vehicleLines, vehicleGrandTotalMinor]);

  const spareValidationErrors = useMemo(() => {
    const errors: string[] = [];
    const qty = Number(quantity);
    const unitCostMinor = parseRupeeInputToMinor(unitCost);

    if (!supplierId) errors.push("Select a vendor.");
    if (!partId) errors.push("Select a part.");
    if (!quantity.trim()) {
      errors.push("Enter a quantity.");
    } else if (!Number.isInteger(qty) || qty < 1) {
      errors.push("Quantity must be a whole number of at least 1.");
    }
    if (!unitCost.trim()) {
      errors.push("Enter a unit cost.");
    } else if (unitCostMinor == null || unitCostMinor <= 0) {
      errors.push("Enter a valid unit cost greater than zero.");
    }
    if (!invoiceDate) errors.push("Select an invoice date.");

    return errors;
  }, [supplierId, partId, quantity, unitCost, invoiceDate]);

  const isVehicleValid = vehicleValidationErrors.length === 0;
  const isSpareValid = spareValidationErrors.length === 0;
  const activeValidationErrors =
    tab === "vehicle" ? vehicleValidationErrors : spareValidationErrors;
  const displayedValidationErrors = hasAttemptedSubmit ? activeValidationErrors : [];

  const getVehicleLineErrors = (line: VehicleLineForm) => {
    const qty = Number(line.quantity);
    const rateMinor = parseRupeeInputToMinor(line.rate);
    const vatPercent = parseVatPercent(line.vatPercent);

    return {
      assetClassId: !line.assetClassId ? "Select an asset class." : "",
      quantity: !line.quantity.trim()
        ? "Enter a quantity."
        : !Number.isInteger(qty) || qty < 1
          ? "Quantity must be a whole number of at least 1."
          : "",
      rate: !line.rate.trim()
        ? "Enter a rate."
        : rateMinor == null || rateMinor <= 0
          ? "Enter a valid rate greater than zero."
          : "",
      taxMode: !line.taxMode ? "Select a tax treatment." : "",
      vatPercent: !line.taxMode
        ? ""
        : !line.vatPercent.trim()
          ? "Enter the VAT percentage."
          : vatPercent == null
            ? "VAT must be a whole number between 0 and 100."
            : "",
    };
  };

  const fieldClassName = (hasError: boolean) =>
    `w-full rounded-md border px-3 py-2 text-sm ${hasError ? "border-red-500 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500" : "border-slate-200"}`;

  const renderFieldError = (message?: string) =>
    message ? <p className="mt-1 text-xs text-red-600" role="alert">{message}</p> : null;

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!token || !organizationId) throw new Error("Not authenticated");
      if (tab === "vehicle") {
        if (!isVehicleValid || vehicleGrandTotalMinor == null) {
          throw new Error("Invalid vehicle invoice");
        }
        const lines = vehicleLines.map((line, index) => {
          const rateMinor = parseRupeeInputToMinor(line.rate);
          const qty = Number(line.quantity);
          const vatPercent = parseVatPercent(line.vatPercent);
          const breakdown = vehicleLineBreakdowns[index];
          if (
            rateMinor == null ||
            !Number.isInteger(qty) ||
            qty < 1 ||
            !line.taxMode ||
            vatPercent == null ||
            !breakdown
          ) {
            throw new Error("Invalid vehicle line");
          }
          return {
            assetClassId: line.assetClassId,
            quantity: qty,
            rateMinor,
            taxMode: line.taxMode,
            vatPercent,
          };
        });
        return createPurchaseVehicleInvoiceApi(token, organizationId, {
          organizationId,
          supplierId,
          invoiceDate,
          lines,
          grandTotalMinor: vehicleGrandTotalMinor,
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
        notes: spareNotes.trim() || undefined,
      });
    },
    onSuccess: (detail) => {
      showFinanceInvoiceCreatedToast(detail.invoiceNumber);
      router.push(financeInvoicesListHref);
    },
    onError: () => {
      showErrorToast(FINANCE_INVOICE_SAVE_ERROR);
    },
    onSettled: () => {
      isSubmittingRef.current = false;
    },
  });

  // Keep Save clickable while the form is invalid so the first click can
  // reveal validation messages. Submission itself is blocked by handleSave.
  const canSubmit = canCreate && !createMutation.isPending;

  const handleSave = () => {
    setHasAttemptedSubmit(true);
    if (activeValidationErrors.length > 0) return;
    if (isSubmittingRef.current || createMutation.isPending) return;

    isSubmittingRef.current = true;
    createMutation.mutate();
  };

  const infoBanner =
    tab === "vehicle"
      ? `Invoice number is assigned automatically (${PURCHASE_INVOICE_NUMBER_FORMAT_HINT}). Add one or more asset class lines; tax breakdown follows inclusive or exclusive rules from the server.`
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
            onClick={() => {
              setTab(value);
              setHasAttemptedSubmit(false);
            }}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${tab === value
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

  const updateVehicleLine = (
    key: string,
    patch: Partial<VehicleLineForm>,
  ) => {
    setVehicleLines((prev) =>
      prev.map((line) => (line.key === key ? { ...line, ...patch } : line)),
    );
  };

  const removeVehicleLine = (key: string) => {
    setVehicleLines((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((line) => line.key !== key);
    });
  };

  if (!canCreate && !authLoading) {
    return (
      <OrganizationFormLayout
        title="Add purchase invoice"

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
      infoText={infoBanner}
      contentVariant="form-card"

      actions={
        <FormActions
          hasAttemptedSubmit={hasAttemptedSubmit}
          validationSummary={displayedValidationErrors}
          isSaving={createMutation.isPending}
          canSubmit={canSubmit}
          onCancel={() => router.push(financeInvoicesListHref)}
          onSave={handleSave}
          saveLabel="Save invoice"
          savingLabel="Saving..."
        />
      }

    >
      {tabButtons}

      {loadingCatalog ? (
        <p className="text-sm text-slate-500">Loading catalogs…</p>
      ) : tab === "vehicle" ? (
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Invoice date *
            </label>
            <input
              type="date"
              className={fieldClassName(hasAttemptedSubmit && !invoiceDate)}
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
              aria-invalid={hasAttemptedSubmit && !invoiceDate}
            />
            {hasAttemptedSubmit && renderFieldError(!invoiceDate ? "Select an invoice date." : "")}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Vendor *
            </label>
            <select
              className={fieldClassName(hasAttemptedSubmit && !supplierId)}
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              disabled={suppliers.length === 0}
              aria-invalid={hasAttemptedSubmit && !supplierId}
            >
              <option value="">Select supplier</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            {hasAttemptedSubmit && renderFieldError(!supplierId ? "Select a vendor." : "")}
            {suppliers.length === 0 ? (
              <p className="mt-1 text-xs text-slate-500">
                No active suppliers in this organization. Add a supplier under
                Organisation before creating a purchase invoice.
              </p>
            ) : null}
          </div>

          {vehicleLines.map((line, index) => {
            const breakdown = vehicleLineBreakdowns[index];
            return (
              <div
                key={line.key}
                className="space-y-4 rounded-lg border border-slate-200 p-4"
              >
                <p className="text-sm font-medium text-slate-800">
                  Asset line {index + 1}
                </p>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Asset class *
                  </label>
                  <select
                    className={fieldClassName(hasAttemptedSubmit && !line.assetClassId)}
                    value={line.assetClassId}
                    onChange={(e) =>
                      updateVehicleLine(line.key, {
                        assetClassId: e.target.value,
                      })
                    }
                    disabled={assetClasses.length === 0}
                    aria-invalid={hasAttemptedSubmit && !line.assetClassId}
                  >
                    <option value="">Select asset class</option>
                    {assetClasses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.specLabel || c.name}
                      </option>
                    ))}
                  </select>
                  {hasAttemptedSubmit && renderFieldError(getVehicleLineErrors(line).assetClassId)}
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      Quantity *
                    </label>
                    <RestrictedInput
                      restrictedKind="digits"
                      value={line.quantity}
                      onChange={(value) =>
                        updateVehicleLine(line.key, { quantity: value })
                      }
                      placeholder={FINANCE_INVOICE_QUANTITY_PLACEHOLDER}
                    />
                    {hasAttemptedSubmit && renderFieldError(getVehicleLineErrors(line).quantity)}
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      Rate (₹ per unit) *
                    </label>
                    <RestrictedInput
                      restrictedKind="inrRupee"
                      value={line.rate}
                      onChange={(value) =>
                        updateVehicleLine(line.key, { rate: value })
                      }
                      placeholder={INR_RUPEE_INPUT_PLACEHOLDER}
                    />
                    {hasAttemptedSubmit && renderFieldError(getVehicleLineErrors(line).rate)}
                  </div>
                </div>
                <fieldset>
                  <legend className="mb-2 text-sm font-medium text-slate-700">
                    Tax treatment *
                  </legend>
                  <div className="flex flex-wrap gap-4">
                    {(
                      [
                        ["INCLUSIVE", "Inclusive tax"],
                        ["EXCLUSIVE", "Exclusive tax"],
                      ] as const
                    ).map(([value, label]) => (
                      <label
                        key={value}
                        className="flex cursor-pointer items-center gap-2 text-sm text-slate-700"
                      >
                        <input
                          type="radio"
                          name={`tax-mode-${line.key}`}
                          checked={line.taxMode === value}
                          onChange={() =>
                            updateVehicleLine(line.key, { taxMode: value })
                          }
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                  {hasAttemptedSubmit && renderFieldError(getVehicleLineErrors(line).taxMode)}
                </fieldset>
                {line.taxMode ? (
                  <div className="w-full md:w-1/2">
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      VAT % *
                    </label>
                    <RestrictedInput
                      restrictedKind="digits"
                      value={line.vatPercent}
                      onChange={(value) =>
                        updateVehicleLine(line.key, { vatPercent: value })
                      }
                      maxLength={3}
                      placeholder={FINANCE_INVOICE_VAT_PERCENT_PLACEHOLDER}
                    />
                    {hasAttemptedSubmit && renderFieldError(getVehicleLineErrors(line).vatPercent)}
                  </div>
                ) : null}
                {breakdown ? (
                  <dl className="grid gap-2 rounded-md bg-slate-50 p-3 text-sm text-slate-700 md:grid-cols-3">
                    <div>
                      <dt className="text-xs text-slate-500">Base</dt>
                      <dd>{formatInrFromMinor(breakdown.baseAmountMinor)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-slate-500">VAT</dt>
                      <dd>{formatInrFromMinor(breakdown.taxAmountMinor)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-slate-500">Line total</dt>
                      <dd className="font-medium">
                        {formatInrFromMinor(breakdown.lineTotalMinor)}
                      </dd>
                    </div>
                  </dl>
                ) : null}
                {index > 0 ? (
                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => removeVehicleLine(line.key)}
                      disabled={createMutation.isPending}
                      className="flex h-9 w-9 items-center justify-center rounded-md text-slate-400 transition hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-50"
                      title="Remove asset line"
                      aria-label="Remove asset line"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </button>
                  </div>
                ) : null}
              </div>
            );
          })}

          {assetClassesQuery.isError ? (
            <p className="text-xs text-red-600" role="alert">
              Could not load asset classes. Check your connection and try
              refreshing the page.
            </p>
          ) : null}
          {!assetClassesQuery.isLoading &&
            !assetClassesQuery.isError &&
            assetClasses.length === 0 ? (
            <p className="text-xs text-slate-500">
              No active asset classes. Define asset classes in Asset Register
              before recording a vehicle purchase invoice.
            </p>
          ) : null}

          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              setVehicleLines((prev) => [...prev, createEmptyVehicleLine()])
            }
            disabled={createMutation.isPending}
          >
            Add more assets
          </Button>

          <div className="space-y-4 rounded-md border border-slate-200 bg-slate-50 px-4 py-4">
            <h3 className="text-sm font-semibold text-slate-900">
              Invoice summary
            </h3>

            {vehicleInvoiceSummary.lines.length === 0 ? (
              <p className="text-sm text-slate-500">
                Complete each asset line (class, quantity, rate, tax treatment,
                and VAT) to see line and invoice totals.
              </p>
            ) : (
              <>
                <ul className="space-y-2">
                  {vehicleInvoiceSummary.lines.map((row) => (
                    <li
                      key={row.key}
                      className="rounded-md border border-slate-100 bg-white px-3 py-3 text-sm text-slate-700"
                    >
                      <p className="font-medium text-slate-800">{row.title}</p>
                      <p className="text-xs text-slate-500">{row.taxHint}</p>
                      <dl className="mt-2 grid gap-2 md:grid-cols-3">
                        <div>
                          <dt className="text-xs text-slate-500">Base</dt>
                          <dd>{formatInrFromMinor(row.baseAmountMinor)}</dd>
                        </div>
                        <div>
                          <dt className="text-xs text-slate-500">VAT</dt>
                          <dd>{formatInrFromMinor(row.taxAmountMinor)}</dd>
                        </div>
                        <div>
                          <dt className="text-xs text-slate-500">
                            Line total
                          </dt>
                          <dd className="font-medium">
                            {formatInrFromMinor(row.lineTotalMinor)}
                          </dd>
                        </div>
                      </dl>
                    </li>
                  ))}
                </ul>

                <div className="space-y-2 border-t border-slate-200 pt-3 text-sm text-slate-700">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-slate-600">
                      Subtotal (taxable base)
                    </span>
                    <span className="font-medium tabular-nums">
                      {vehicleInvoiceSummary.totalBaseMinor != null
                        ? formatInrFromMinor(
                          vehicleInvoiceSummary.totalBaseMinor,
                        )
                        : "—"}
                    </span>
                  </div>
                  {vehicleInvoiceSummary.vatGroups.map((group) => (
                    <div
                      key={`${group.taxMode}-${group.vatPercent}`}
                      className="flex items-center justify-between gap-4 text-slate-600"
                    >
                      <span>
                        VAT @ {group.vatPercent}% (
                        {group.taxMode === "INCLUSIVE"
                          ? "Inclusive"
                          : "Exclusive"}
                        )
                      </span>
                      <span className="tabular-nums">
                        {formatInrFromMinor(group.taxAmountMinor)}
                      </span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between gap-4 border-t border-slate-200 pt-2">
                    <span className="font-semibold text-slate-900">
                      Grand total
                    </span>
                    <span className="text-lg font-semibold tabular-nums text-slate-900">
                      {vehicleInvoiceSummary.totalGrandMinor != null
                        ? formatInrFromMinor(
                          vehicleInvoiceSummary.totalGrandMinor,
                        )
                        : "—"}
                    </span>
                  </div>
                  {!vehicleInvoiceSummary.allLinesComplete ? (
                    <p className="text-xs text-slate-500">
                      Totals include completed lines only. Finish every asset
                      line before saving.
                    </p>
                  ) : null}
                </div>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Vendor *
            </label>
            <select
              className={fieldClassName(hasAttemptedSubmit && !supplierId)}
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              disabled={suppliers.length === 0}
              aria-invalid={hasAttemptedSubmit && !supplierId}
            >
              <option value="">Select supplier</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            {hasAttemptedSubmit && renderFieldError(!supplierId ? "Select a vendor." : "")}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Part *
            </label>
            <select
              className={fieldClassName(hasAttemptedSubmit && !partId)}
              value={partId}
              onChange={(e) => setPartId(e.target.value)}
              disabled={
                partsQuery.isLoading ||
                partsQuery.isError ||
                parts.length === 0
              }
              aria-invalid={hasAttemptedSubmit && !partId}
            >
              <option value="">Select part</option>
              {parts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {p.partCode ? ` (${p.partCode})` : ""}
                </option>
              ))}
            </select>
            {hasAttemptedSubmit && renderFieldError(!partId ? "Select a part." : "")}
            {partsQuery.isError ? (
              <p className="mt-1 text-xs text-red-600" role="alert">
                Could not load parts catalog. Check your connection and try
                refreshing the page.
              </p>
            ) : null}
            {!partsQuery.isLoading &&
              !partsQuery.isError &&
              parts.length === 0 ? (
              <p className="mt-1 text-xs text-slate-500">
                No parts in the catalog yet. Parts must exist in the finance
                parts catalog before you can record a spare parts purchase
                invoice.
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
                placeholder={FINANCE_INVOICE_QUANTITY_PLACEHOLDER}
              />
              {hasAttemptedSubmit && renderFieldError(!quantity.trim() ? "Enter a quantity." : !Number.isInteger(Number(quantity)) || Number(quantity) < 1 ? "Quantity must be a whole number of at least 1." : "")}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Unit cost (₹) *
              </label>
              <RestrictedInput
                restrictedKind="inrRupee"
                value={unitCost}
                onChange={setUnitCost}
                placeholder={INR_RUPEE_INPUT_PLACEHOLDER}
              />
              {hasAttemptedSubmit && renderFieldError(!unitCost.trim() ? "Enter a unit cost." : parseRupeeInputToMinor(unitCost) == null || parseRupeeInputToMinor(unitCost)! <= 0 ? "Enter a valid unit cost greater than zero." : "")}
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
              placeholder={FINANCE_INVOICE_BATCH_LOT_PLACEHOLDER}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Invoice date *
            </label>
            <input
              type="date"
              className={fieldClassName(hasAttemptedSubmit && !invoiceDate)}
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
              aria-invalid={hasAttemptedSubmit && !invoiceDate}
            />
            {hasAttemptedSubmit && renderFieldError(!invoiceDate ? "Select an invoice date." : "")}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Notes (optional)
            </label>
            <RestrictedInput
              restrictedKind="text"
              value={spareNotes}
              onChange={setSpareNotes}
              maxLength={2000}
              placeholder={FINANCE_INVOICE_SPARE_NOTES_PLACEHOLDER}
            />
          </div>
        </div>
      )}
    </OrganizationFormLayout>
  );
}
