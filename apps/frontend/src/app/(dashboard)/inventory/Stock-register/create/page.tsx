"use client";

import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import CreatePartForm, {
  type PartFormData,
} from "@/components/modules/inventory/StockRegister/StockFormRegister";
import { useAuth } from "@/providers/auth-provider";
import { createSparePartApi } from "@/lib/api/inventory/stock-register";
import { inventoryStockRegisterDetailHref } from "@/lib/navigation/inventory-static-routes";
import {
  showApiErrorToast,
  showSparePartCreatedToast,
} from "@/lib/toast/show-toast";
import { invalidateSparePartCaches } from "@/lib/query/invalidate-domain-caches";

export default function StockCreatePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { token, organizationId, permissions } = useAuth();

  const canCreate =
    permissions.has("inventory.create") ||
    permissions.has("inventory.manage");

  const createMutation = useMutation({
    mutationFn: (data: PartFormData) =>
      createSparePartApi(
        {
          organizationId: organizationId!,
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
      void invalidateSparePartCaches(queryClient);
      showSparePartCreatedToast(result.partName);
      router.push(inventoryStockRegisterDetailHref(result.id));
    },
    onError: (error) => showApiErrorToast(error, "Failed to save part."),
  });

  if (!canCreate) {
    return (
      <div className="p-6">
        <p className="text-sm text-gray-500">
          You do not have permission to create parts.
        </p>
      </div>
    );
  }

  return (
    <CreatePartForm
      onSaved={async (data) => {
        await createMutation.mutateAsync(data);
      }}
    />
  );
}
