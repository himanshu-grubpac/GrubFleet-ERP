"use client";

import { useParams, useRouter } from "next/navigation";
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
  showErrorToast,
  showSparePartUpdatedToast,
} from "@/lib/toast/show-toast";

export default function StockEditPage() {
  const params = useParams();
  const router = useRouter();
  const { token, organizationId, isLoading: isAuthLoading } = useAuth();

  const stockId = String(params.id);

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
      router.push(`/inventory/Stock-register/${stockId}`);
    },
    onError: () => showErrorToast("Failed to update part."),
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
    router.replace(`/inventory/Stock-register/${stockId}`);
    return null;
  }

  return (
    <CreatePartForm
      mode="edit"
      initialData={{
        name: stock.partName,
        compatibleAssetClasses: stock.compatibleAssetClasses,
        unitOfMeasure: stock.unitOfMeasure,
        retailMarkup: stock.retailMarkup,
        wholesaleMarkup: stock.wholesaleMarkup,
        threshold: stock.threshold,
      }}
      onCancel={() => router.push(`/inventory/Stock-register/${stockId}`)}
      onSaved={async (data) => {
        await updateMutation.mutateAsync(data);
      }}
    />
  );
}
