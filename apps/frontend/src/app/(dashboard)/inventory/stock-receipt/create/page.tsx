"use client";
import { navigateToEntityShell } from "@/lib/navigation/secure-entity-navigation";

import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import StockReciptForm, {
  STOCK_RECEIPT_MANUAL_INVOICE,
  type StockFormData,
} from "@/components/modules/inventory/StockReceipt/StockReciptForm";
import { fetchAllFinancePurchaseInvoicesCatalogApi } from "@/lib/api/finance/invoices";
import { useAuth } from "@/providers/auth-provider";
import { fetchAllActiveStockRegisterPartsApi } from "@/lib/api/inventory/stock-register";
import { createStockReceiptApi } from "@/lib/api/inventory/stock-receipts";
import { fetchAllActiveOrganisationLocationsApi } from "@/lib/api/organisation/locations";
import { inventoryStockReceiptDetailHref } from "@/lib/navigation/inventory-static-routes";
import {
  showApiErrorToast,
  showStockReceiptCreatedToast,
} from "@/lib/toast/show-toast";
import { invalidateStockReceiptCaches } from "@/lib/query/invalidate-domain-caches";
import { parseRupeeInputToMinor } from "@/lib/format/money-format";

export default function CreateStockPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { token, organizationId, permissions } = useAuth();

  const canCreate =
    permissions.has("inventory.create") ||
    permissions.has("inventory.manage");

  const partsQuery = useQuery({
    queryKey: ["inventory", "stock-register", "catalog", organizationId],
    queryFn: () =>
      fetchAllActiveStockRegisterPartsApi(organizationId!, token!),
    enabled: !!token && !!organizationId,
  });

  const purchaseInvoicesQuery = useQuery({
    queryKey: ["finance", "invoices", "purchase-catalog", organizationId],
    queryFn: () =>
      fetchAllFinancePurchaseInvoicesCatalogApi(token!, organizationId!),
    enabled: !!token && !!organizationId,
  });

  const locationsQuery = useQuery({
    queryKey: ["organisation", "locations", "catalog", organizationId],
    queryFn: () =>
      fetchAllActiveOrganisationLocationsApi(token!, organizationId!),
    enabled: !!token && !!organizationId,
  });

  const createMutation = useMutation({
    mutationFn: (data: StockFormData) => {
      const unitCostMinor = parseRupeeInputToMinor(data.unitCost);
      if (unitCostMinor === null) {
        throw new Error("Unit cost must be a valid amount.");
      }
      const qty = Number(data.quantityReceived);
      const invoiceSelection = data.purchaseInvoice.trim();
      const isManual =
        !invoiceSelection ||
        invoiceSelection === STOCK_RECEIPT_MANUAL_INVOICE;
      return createStockReceiptApi(
        {
          organizationId: organizationId!,
          partId: data.part,
          locationId: data.destinationLocation,
          financeInvoiceId: isManual ? undefined : invoiceSelection,
          purchaseInvoiceReference: isManual
            ? data.purchaseInvoiceManualRef.trim() || undefined
            : undefined,
          purchaseDate: data.purchaseDate.trim(),
          expiryDate: data.expiryDate.trim() || undefined,
          quantityReceived: qty,
          quantityUnitCostMinor: unitCostMinor,
          batchLotReference: data.batchLotReference.trim() || undefined,
          notes: data.notes.trim() || undefined,
        },
        token!,
      );
    },
    onSuccess: (result) => {
      void invalidateStockReceiptCaches(queryClient);
      showStockReceiptCreatedToast(result.receiptNumber);
      navigateToEntityShell(router, inventoryStockReceiptDetailHref(result.id), result.id, 'push');
    },
    onError: (error) =>
      showApiErrorToast(error, "Failed to save stock receipt."),
  });

  if (!canCreate) {
    return (
      <div className="p-6">
        <p className="text-sm text-gray-500">
          You do not have permission to record receipts.
        </p>
      </div>
    );
  }

  const partOptions =
    (partsQuery.data ?? []).map((p) => ({
      value: p.id,
      label: `${p.partName} — ${p.partNumber}`,
    }));

  const locationOptions =
    (locationsQuery.data ?? []).map((loc) => ({
      value: loc.id,
      label: loc.name,
    }));

  const isCatalogLoading =
    partsQuery.isLoading ||
    locationsQuery.isLoading ||
    purchaseInvoicesQuery.isLoading;

  const purchaseInvoiceOptions = [
    {
      value: STOCK_RECEIPT_MANUAL_INVOICE,
      label: "Manual / unlinked",
    },
    ...((purchaseInvoicesQuery.data ?? []).map((invoice) => ({
      value: invoice.id,
      label: invoice.invoiceNumber?.trim() || invoice.id,
    }))),
  ];

  return (
    <StockReciptForm
      partOptions={partOptions}
      locationOptions={locationOptions}
      purchaseInvoiceOptions={purchaseInvoiceOptions}
      isCatalogLoading={isCatalogLoading}
      onSaved={async (data) => {
        await createMutation.mutateAsync(data);
      }}
    />
  );
}
