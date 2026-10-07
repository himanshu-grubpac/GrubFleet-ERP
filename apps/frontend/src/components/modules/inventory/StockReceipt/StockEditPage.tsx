"use client";

import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";

import StockReciptForm, {
  type StockFormData,
} from "@/components/modules/inventory/StockReceipt/StockReciptForm";
import { useAuth } from "@/providers/auth-provider";
import { fetchStockRegisterListApi } from "@/lib/api/inventory/stock-register";
import {
  fetchStockReceiptDetailApi,
  updateStockReceiptApi,
} from "@/lib/api/inventory/stock-receipts";
import { fetchOrganisationLocationsApi } from "@/lib/api/organisation/locations";
import {
  showErrorToast,
  showStockReceiptUpdatedToast,
} from "@/lib/toast/show-toast";

export default function StockEditPage() {
  const params = useParams();
  const router = useRouter();
  const receiptId = String(params.id);
  const { token, organizationId, isLoading: isAuthLoading } = useAuth();

  const detailQuery = useQuery({
    queryKey: ["inventory", "stock-receipts", organizationId, receiptId],
    queryFn: () =>
      fetchStockReceiptDetailApi(organizationId!, receiptId, token!),
    enabled: !!token && !!organizationId && !isAuthLoading,
  });

  const partsQuery = useQuery({
    queryKey: ["inventory", "stock-register", "catalog", organizationId],
    queryFn: () =>
      fetchStockRegisterListApi(
        { organizationId: organizationId!, page: 1, pageSize: 50, status: "active" },
        token!,
      ),
    enabled: !!token && !!organizationId,
  });

  const locationsQuery = useQuery({
    queryKey: ["organisation", "locations", "catalog", organizationId],
    queryFn: () =>
      fetchOrganisationLocationsApi(token!, {
        organizationId: organizationId!,
        page: 1,
        pageSize: 50,
      }),
    enabled: !!token && !!organizationId,
  });

  const updateMutation = useMutation({
    mutationFn: (data: StockFormData) => {
      const unitCost = Number(data.unitCost);
      const qty = Number(data.quantityReceived);
      return updateStockReceiptApi(
        organizationId!,
        receiptId,
        {
          locationId: data.destinationLocation,
          purchaseInvoiceReference: data.purchaseInvoice.trim(),
          quantityReceived: qty,
          quantityUnitCostMinor: Math.round(unitCost * 100),
          batchLotReference: data.batchLotReference.trim() || undefined,
          notes: data.notes.trim() || undefined,
        },
        token!,
      );
    },
    onSuccess: (result) => {
      showStockReceiptUpdatedToast(result.receiptNumber);
      router.push(`/inventory/stock-receipt/${receiptId}`);
    },
    onError: () => showErrorToast("Failed to update stock receipt."),
  });

  if (detailQuery.isLoading || isAuthLoading) {
    return (
      <div className="p-6">
        <p className="text-sm text-gray-500">Loading receipt…</p>
      </div>
    );
  }

  if (detailQuery.isError || !detailQuery.data) {
    return (
      <div className="p-6">
        <p className="text-sm text-gray-500">Stock receipt not found.</p>
      </div>
    );
  }

  const receipt = detailQuery.data;
  if (receipt.status === "inactive") {
    router.replace(`/inventory/stock-receipt/${receiptId}`);
    return null;
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
    partsQuery.isLoading || locationsQuery.isLoading;

  return (
    <StockReciptForm
      mode="edit"
      partOptions={partOptions}
      locationOptions={locationOptions}
      isCatalogLoading={isCatalogLoading}
      purchaseInvoiceOptions={[
        {
          value: receipt.purchaseInvoiceReference ?? "Manual / unlinked",
          label: receipt.purchaseInvoiceReference ?? "Manual / unlinked",
        },
      ]}
      initialData={{
        part: receipt.partId,
        purchaseInvoice: receipt.purchaseInvoiceReference ?? "",
        destinationLocation: receipt.locationId,
        quantityReceived: String(receipt.quantityReceived),
        unitCost: String(receipt.unitCostMinor / 100),
        batchLotReference: receipt.batchLotReference ?? "",
        notes: receipt.notes ?? "",
      }}
      onCancel={() => router.push(`/inventory/stock-receipt/${receiptId}`)}
      onSaved={async (data) => {
        await updateMutation.mutateAsync(data);
      }}
    />
  );
}
