"use client";
import { navigateToEntityShell } from "@/lib/navigation/secure-entity-navigation";

import { useRouter } from "next/navigation";
import {
  inventoryStockRegisterDetailHref,
} from "@/lib/navigation/inventory-static-routes";
import { useInventoryEntityId } from "@/lib/navigation/use-inventory-entity-id";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import CreatePartForm, {
  type PartFormData,
} from "@/components/modules/inventory/StockRegister/StockFormRegister";
import { RedirectingState } from "@/components/states/async-states";
import {
  DashboardDetailErrorShell,
  DashboardPageLoadingShell,
} from "@/components/dashboard/dashboard-async-states";
import { useAuth } from "@/providers/auth-provider";
import { invalidateSparePartCaches } from "@/lib/query/invalidate-domain-caches";
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
  const queryClient = useQueryClient();
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
      void invalidateSparePartCaches(queryClient);
      showSparePartUpdatedToast(result.partName);
      navigateToEntityShell(router, inventoryStockRegisterDetailHref(stockId), stockId, 'push');
    },
    onError: (error) => showApiErrorToast(error, "Failed to update part."),
  });

  if (detailQuery.isLoading || isAuthLoading) {
    return (
      <div className="p-6">
        <DashboardPageLoadingShell label="Loading part…" />
      </div>
    );
  }

  if (detailQuery.isError || !detailQuery.data) {
    return (
      <div className="p-6">
        <DashboardDetailErrorShell
          title="Failed to load part"
          error={detailQuery.error}
          fallbackMessage="Stock record not found."
          onRetry={() => void detailQuery.refetch()}
        />
      </div>
    );
  }

  const stock = detailQuery.data;

  if (stock.status === "inactive") {
    navigateToEntityShell(router, inventoryStockRegisterDetailHref(stockId), stockId, 'replace');
    return <RedirectingState />;
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
      onCancel={() => navigateToEntityShell(router, inventoryStockRegisterDetailHref(stockId), stockId, 'push')}
      onSaved={async (data) => {
        await updateMutation.mutateAsync(data);
      }}
    />
  );
}
