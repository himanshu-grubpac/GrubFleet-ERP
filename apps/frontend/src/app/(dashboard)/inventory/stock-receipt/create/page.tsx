"use client";

import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";

import StockReciptForm, {
  type StockFormData,
} from "@/components/modules/inventory/StockReceipt/StockReciptForm";
import { useAuth } from "@/providers/auth-provider";
import { fetchStockRegisterListApi } from "@/lib/api/inventory/stock-register";
import { createStockReceiptApi } from "@/lib/api/inventory/stock-receipts";
import { fetchOrganisationLocationsApi } from "@/lib/api/organisation/locations";
import {
  showErrorToast,
  showStockReceiptCreatedToast,
} from "@/lib/toast/show-toast";

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

  const createMutation = useMutation({
    mutationFn: (data: StockFormData) => {
      const unitCost = Number(data.unitCost);
      const qty = Number(data.quantityReceived);
      return createStockReceiptApi(
        {
          organizationId: organizationId!,
          partId: data.part,
          locationId: data.destinationLocation,
          purchaseInvoiceReference: data.purchaseInvoice.trim(),
          purchaseDate: new Date().toISOString().slice(0, 10),
          quantityReceived: qty,
          quantityUnitCostMinor: Math.round(unitCost * 100),
          batchLotReference: data.batchLotReference.trim() || undefined,
          notes: data.notes.trim() || undefined,
        },
        token!,
      );
    },
    onSuccess: (result) => {
      showStockReceiptCreatedToast(result.receiptNumber);
      router.push(`/inventory/stock-receipt/${result.id}`);
    },
    onError: () => showErrorToast("Failed to save stock receipt."),
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
    partsQuery.isLoading || locationsQuery.isLoading;

  return (
    <StockReciptForm
      partOptions={partOptions}
      locationOptions={locationOptions}
      purchaseInvoiceOptions={[
        { value: "Manual / unlinked", label: "Manual / unlinked" },
      ]}
      isCatalogLoading={isCatalogLoading}
      onSaved={async (data) => {
        await createMutation.mutateAsync(data);
      }}
    />
  );
}
