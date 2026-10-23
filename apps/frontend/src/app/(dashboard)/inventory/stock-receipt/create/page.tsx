"use client";

import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";

import StockReciptForm, {
  STOCK_RECEIPT_MANUAL_INVOICE,
  type StockFormData,
} from "@/components/modules/inventory/StockReceipt/StockReciptForm";
import { fetchFinanceInvoicesApi } from "@/lib/api/finance/invoices";
import { useAuth } from "@/providers/auth-provider";
import { fetchStockRegisterListApi } from "@/lib/api/inventory/stock-register";
import { createStockReceiptApi } from "@/lib/api/inventory/stock-receipts";
import { fetchOrganisationLocationsApi } from "@/lib/api/organisation/locations";
import { inventoryStockReceiptDetailHref } from "@/lib/navigation/inventory-static-routes";
import {
  showApiErrorToast,
  showStockReceiptCreatedToast,
} from "@/lib/toast/show-toast";
import { parseRupeeInputToMinor } from "@/lib/format/money-format";

export default function CreateStockPage() {
  const router = useRouter();
  const { token, organizationId, permissions } = useAuth();

  const canCreate =
    permissions.has("inventory.create") ||
    permissions.has("inventory.manage");

  const partsQuery = useQuery({
    queryKey: ["inventory", "stock-register", "catalog", organizationId],
    queryFn: () =>
      fetchStockRegisterListApi(
        { organizationId: organizationId!, page: 1, pageSize: 200, status: "active" },
        token!,
      ),
    enabled: !!token && !!organizationId,
  });

  const purchaseInvoicesQuery = useQuery({
    queryKey: ["finance", "invoices", "purchase-catalog", organizationId],
    queryFn: () =>
      fetchFinanceInvoicesApi(token!, {
        organizationId: organizationId!,
        page: 1,
        pageSize: 200,
        invoiceType: "purchase",
      }),
    enabled: !!token && !!organizationId,
  });

  const locationsQuery = useQuery({
    queryKey: ["organisation", "locations", "catalog", organizationId],
    queryFn: () =>
      fetchOrganisationLocationsApi(token!, {
        organizationId: organizationId!,
        page: 1,
        pageSize: 200,
      }),
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
      showStockReceiptCreatedToast(result.receiptNumber);
      router.push(inventoryStockReceiptDetailHref(result.id));
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
    partsQuery.data?.items.map((p) => ({
      value: p.id,
      label: `${p.partName} — ${p.partNumber}`,
    })) ?? [];

  const locationOptions =
    locationsQuery.data?.items.map((loc) => ({
      value: loc.id,
      label: loc.name,
    })) ?? [];

  const isCatalogLoading =
    partsQuery.isLoading ||
    locationsQuery.isLoading ||
    purchaseInvoicesQuery.isLoading;

  const purchaseInvoiceOptions = [
    {
      value: STOCK_RECEIPT_MANUAL_INVOICE,
      label: "Manual / unlinked",
    },
    ...(purchaseInvoicesQuery.data?.items.map((invoice) => ({
      value: invoice.id,
      label: invoice.invoiceNumber?.trim() || invoice.id,
    })) ?? []),
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
