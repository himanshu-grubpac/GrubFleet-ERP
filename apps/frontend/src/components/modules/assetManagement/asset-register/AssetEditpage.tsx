"use client";
import { navigateToEntityShell } from "@/lib/navigation/secure-entity-navigation";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  assetRegisterAssetClassDetailHref,
} from "@/lib/navigation/asset-register-static-routes";
import { useAssetRegisterEntityId } from "@/lib/navigation/use-asset-register-entity-id";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { invalidateAssetClassCaches } from "@/lib/query/invalidate-domain-caches";

import CreateAssetClassForm, {
  type AssetClassFormData,
} from "@/components/modules/assetManagement/asset-register/AssetFormPage";
import {
  LoadingState,
  RedirectingState,
} from "@/components/states/async-states";
import { useAuth } from "@/providers/auth-provider";
import {
  fetchAssetRegisterAssetClassApi,
  updateAssetRegisterAssetClassApi,
} from "@/lib/api/asset-register/asset-classes";
import {
  assetClassDetailToFormData,
  assetClassFormToUpdatePayload,
} from "@/lib/api/asset-register/mappers";
import {
  ASSET_CLASS_SAVE_ERROR,
  showAssetClassUpdatedToast,
  showErrorToast,
} from "@/lib/toast/show-toast";

export default function EditAssetClassPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { token, organizationId, isLoading: isAuthLoading } = useAuth();

  const assetClassId = useAssetRegisterEntityId("assetClassId");

  const detailQuery = useQuery({
    queryKey: ["asset-register", "asset-class", organizationId, assetClassId],
    queryFn: () => {
      if (!token || !organizationId) {
        throw new Error("Missing auth context");
      }
      return fetchAssetRegisterAssetClassApi({
        token,
        organizationId,
        id: assetClassId,
      });
    },
    enabled: !!token && !!organizationId && !isAuthLoading,
  });

  useEffect(() => {
    const detail = detailQuery.data;
    if (!detail || detail.isActive) return;
    navigateToEntityShell(router, assetRegisterAssetClassDetailHref(assetClassId), assetClassId, 'replace');
  }, [detailQuery.data, assetClassId, router]);

  if (isAuthLoading || detailQuery.isLoading) {
    return (
      <div className="p-6">
        <LoadingState label="Loading asset class…" />
      </div>
    );
  }

  if (detailQuery.isError || !detailQuery.data) {
    return (
      <div className="p-6">
        <p className="text-sm text-gray-500">Asset class not found.</p>
      </div>
    );
  }

  if (!detailQuery.data.isActive) {
    return <RedirectingState />;
  }

  const handleCancel = () => {
    navigateToEntityShell(router, assetRegisterAssetClassDetailHref(assetClassId), assetClassId, 'push');
  };

  const handleSaved = async (data: AssetClassFormData) => {
    if (!token || !organizationId) {
      throw new Error("Missing auth context. Sign in again and retry.");
    }
    try {
      const updated = await updateAssetRegisterAssetClassApi({
        token,
        organizationId,
        id: assetClassId,
        body: assetClassFormToUpdatePayload(data),
      });
      showAssetClassUpdatedToast(updated.name);
      await invalidateAssetClassCaches(queryClient);
      navigateToEntityShell(router, assetRegisterAssetClassDetailHref(assetClassId), assetClassId, 'push');
    } catch (error) {
      showErrorToast(
        error instanceof Error ? error.message : ASSET_CLASS_SAVE_ERROR,
      );
      throw error;
    }
  };

  return (
    <CreateAssetClassForm
      mode="edit"
      initialData={assetClassDetailToFormData(detailQuery.data)}
      onCancel={handleCancel}
      onSaved={handleSaved}
    />
  );
}
