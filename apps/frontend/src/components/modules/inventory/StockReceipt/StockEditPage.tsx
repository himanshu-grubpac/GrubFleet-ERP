"use client";
import { navigateToEntityShell } from "@/lib/navigation/secure-entity-navigation";

import { useRouter } from "next/navigation";
import {
  inventoryStockReceiptDetailHref,
} from "@/lib/navigation/inventory-static-routes";
import { useInventoryEntityId } from "@/lib/navigation/use-inventory-entity-id";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import StockReciptForm, {
  STOCK_RECEIPT_MANUAL_INVOICE,
  type StockFormData,
} from "@/components/modules/inventory/StockReceipt/StockReciptForm";
import { RedirectingState } from "@/components/states/async-states";
import {
  DashboardDetailErrorShell,
  DashboardPageLoadingShell,
} from "@/components/dashboard/dashboard-async-states";
import { useAuth } from "@/providers/auth-provider";
import { fetchAllActiveStockRegisterPartsApi } from "@/lib/api/inventory/stock-register";
import {
  fetchStockReceiptDetailApi,
  updateStockReceiptApi,
} from "@/lib/api/inventory/stock-receipts";
import { fetchAllActiveOrganisationLocationsApi } from "@/lib/api/organisation/locations";
import { invalidateStockReceiptCaches } from "@/lib/query/invalidate-domain-caches";
import {
  showApiErrorToast,
  showStockReceiptUpdatedToast,
} from "@/lib/toast/show-toast";
import {
  formatRupeeInputDisplay,
  parseRupeeInputToMinor,
} from "@/lib/format/money-format";

export default function StockEditPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const receiptId = useInventoryEntityId("receiptId");
  const { token, organizationId, isLoading: isAuthLoading } = useAuth();

  const detailQuery = useQuery({
    queryKey: ["inventory", "stock-receipts", organizationId, receiptId],
    queryFn: () =>
      fetchStockReceiptDetailApi(organizationId!, receiptId, token!),
    enabled: !!token && !!organizationId && !isAuthLoading && !!receiptId,
  });

  const partsQuery = useQuery({
    queryKey: ["inventory", "stock-register", "catalog", organizationId],
    queryFn: () =>
      fetchAllActiveStockRegisterPartsApi(organizationId!, token!),
    enabled: !!token && !!organizationId,
  });

  const locationsQuery = useQuery({
    queryKey: ["organisation", "locations", "catalog", organizationId],
    queryFn: () =>
      fetchAllActiveOrganisationLocationsApi(token!, organizationId!),
    enabled: !!token && !!organizationId,
  });

  const updateMutation = useMutation({
    mutationFn: (data: StockFormData) => {
      const unitCostMinor = parseRupeeInputToMinor(data.unitCost);
      if (unitCostMinor === null) {
        throw new Error("Unit cost must be a valid amount.");
      }
      const qty = Number(data.quantityReceived);
      return updateStockReceiptApi(
        organizationId!,
        receiptId,
        {
          locationId: data.destinationLocation,
          purchaseInvoiceReference:
            data.purchaseInvoiceManualRef.trim() || undefined,
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
      showStockReceiptUpdatedToast(result.receiptNumber);
      navigateToEntityShell(router, inventoryStockReceiptDetailHref(receiptId), receiptId, 'push');
    },
    onError: (error) =>
      showApiErrorToast(error, "Failed to update stock receipt."),
  });

  const isBootstrapping =
    isAuthLoading ||
    detailQuery.isLoading ||
    partsQuery.isLoading ||
    locationsQuery.isLoading;

  if (isBootstrapping) {
    return (
      <div className="p-6">
        <DashboardPageLoadingShell label="Loading receipt…" />
      </div>
    );
  }

  if (detailQuery.isError || !detailQuery.data) {
    return (
      <div className="p-6">
        <DashboardDetailErrorShell
          title="Failed to load receipt"
          error={detailQuery.error}
          fallbackMessage="Stock receipt not found."
          onRetry={() => void detailQuery.refetch()}
        />
      </div>
    );
  }

  const receipt = detailQuery.data;
  if (receipt.status === "inactive") {
    navigateToEntityShell(router, inventoryStockReceiptDetailHref(receiptId), receiptId, 'replace');
    return <RedirectingState />;
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
    partsQuery.isLoading || locationsQuery.isLoading;

  return (
    <StockReciptForm
      mode="edit"
      partOptions={partOptions}
      locationOptions={locationOptions}
      isCatalogLoading={isCatalogLoading}
      purchaseInvoiceOptions={[
        {
          value: STOCK_RECEIPT_MANUAL_INVOICE,
          label: "Manual / unlinked",
        },
      ]}
      initialData={{
        part: receipt.partId,
        purchaseInvoice: STOCK_RECEIPT_MANUAL_INVOICE,
        purchaseInvoiceManualRef: receipt.purchaseInvoiceReference ?? "",
        purchaseDate: receipt.purchaseDate,
        expiryDate: receipt.expiryDate ?? "",
        destinationLocation: receipt.locationId,
        quantityReceived: String(receipt.quantityReceived),
        unitCost: formatRupeeInputDisplay(
          String(receipt.unitCostMinor / 100),
        ),
        batchLotReference: receipt.batchLotReference ?? "",
        notes: receipt.notes ?? "",
      }}
      onCancel={() => navigateToEntityShell(router, inventoryStockReceiptDetailHref(receiptId), receiptId, 'push')}
      onSaved={async (data) => {
        await updateMutation.mutateAsync(data);
      }}
    />
  );
}
