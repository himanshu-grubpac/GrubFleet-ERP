"use client";

import { useRouter } from "next/navigation";
import {
  inventoryStockRegisterDetailHref,
} from "@/lib/navigation/inventory-static-routes";
import { useInventoryEntityId } from "@/lib/navigation/use-inventory-entity-id";
import { useMutation, useQuery } from "@tanstack/react-query";

import CreatePartForm, {
  type PartFormData,
} from "@/components/modules/inventory/StockRegister/StockFormRegister";
import { useAuth } from "@/providers/auth-provider";
import {
  fetchStockRegisterDetailApi,
  updateSparePartApi,
} from "@/lib/api/inventory/stock-register";
import {
  showApiErrorToast,
  showSparePartUpdatedToast,
} from "@/lib/toast/show-toast";

export default function StockEditPage() {
  const router = useRouter();
  const { token, organizationId, isLoading: isAuthLoading } = useAuth();

  const stockId = useInventoryEntityId("partId");

  const detailQuery = useQuery({
    queryKey: ["inventory", "stock-register", organizationId, stockId],
    queryFn: () =>
      fetchStockRegisterDetailApi(organizationId!, stockId, token!),
    enabled: !!token && !!organizationId && !isAuthLoading && !!stockId,
  });

  const updateMutation = useMutation({
    mutationFn: (data: PartFormData) =>
      updateSparePartApi(
        organizationId!,
        stockId,
        {
          name: data.name.trim(),
          brand: data.brand.trim() || undefined,
          compatibleAssetClasses: data.compatibleAssetClasses,
          unitOfMeasure: data.unitOfMeasure.trim(),
          retailMarkupPercent: Number(data.retailMarkup) || 0,
          wholesaleMarkupPercent: Number(data.wholesaleMarkup) || 0,
          reorderThreshold: Number(data.threshold) || 0,
        },
        token!,
      ),
    onSuccess: (result) => {
      showSparePartUpdatedToast(result.partName);
      router.push(inventoryStockRegisterDetailHref(stockId));
    },
    onError: (error) => showApiErrorToast(error, "Failed to update part."),
  });

  if (detailQuery.isLoading || isAuthLoading) {
    return (
      <div className="p-6">
        <p className="text-sm text-gray-500">Loading part…</p>
      </div>
    );
  }

  if (detailQuery.isError || !detailQuery.data) {
    return (
      <div className="p-6">
        <p className="text-sm text-gray-500">Stock record not found.</p>
      </div>
    );
  }

  const stock = detailQuery.data;

  if (stock.status === "inactive") {
    router.replace(inventoryStockRegisterDetailHref(stockId));
    return null;
  }

  return (
    <CreatePartForm
      mode="edit"
      initialData={{
        name: stock.partName,
        brand: stock.brand ?? "",
        compatibleAssetClasses: stock.compatibleAssetClasses,
        unitOfMeasure: stock.unitOfMeasure,
        retailMarkup: stock.retailMarkup,
        wholesaleMarkup: stock.wholesaleMarkup,
        threshold: stock.threshold,
      }}
      onCancel={() => router.push(inventoryStockRegisterDetailHref(stockId))}
      onSaved={async (data) => {
        await updateMutation.mutateAsync(data);
      }}
    />
  );
}
