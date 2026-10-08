"use client";

import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";

import CreatePartForm, {
  type PartFormData,
} from "@/components/modules/inventory/StockRegister/StockFormRegister";
import { useAuth } from "@/providers/auth-provider";
import { createSparePartApi } from "@/lib/api/inventory/stock-register";
import {
  showErrorToast,
  showSparePartCreatedToast,
} from "@/lib/toast/show-toast";

export default function StockCreatePage() {
  const router = useRouter();
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
          compatibleAssetClasses: data.compatibleAssetClasses,
          unitOfMeasure: data.unitOfMeasure.trim(),
          retailMarkupPercent: Number(data.retailMarkup) || 0,
          wholesaleMarkupPercent: Number(data.wholesaleMarkup) || 0,
          reorderThreshold: Number(data.threshold) || 0,
        },
        token!,
      ),
    onSuccess: (result) => {
      showSparePartCreatedToast(result.partName);
      router.push(`/inventory/Stock-register/${result.id}`);
    },
    onError: () => showErrorToast("Failed to save part."),
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
