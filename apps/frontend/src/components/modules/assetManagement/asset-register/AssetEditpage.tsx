"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import CreateAssetClassForm, {
  type AssetClassFormData,
} from "@/components/modules/assetManagement/asset-register/AssetFormPage";
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
  const params = useParams();
  const router = useRouter();
  const { token, organizationId, isLoading: isAuthLoading } = useAuth();

  const assetClassId = String(params.id);

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

  if (isAuthLoading || detailQuery.isLoading) {
    return (
      <div className="p-6 text-sm text-gray-500">Loading asset class…</div>
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
    router.replace(`/asset-register/assestclass/${assetClassId}`);
    return (
      <div className="p-6 text-sm text-gray-500">Redirecting…</div>
    );
  }

  const handleCancel = () => {
    router.push(`/asset-register/assestclass/${assetClassId}`);
  };

  const handleSaved = async (data: AssetClassFormData) => {
    if (!token || !organizationId) return;
    try {
      const updated = await updateAssetRegisterAssetClassApi({
        token,
        organizationId,
        id: assetClassId,
        body: assetClassFormToUpdatePayload(data),
      });
      showAssetClassUpdatedToast(updated.name);
      router.push(`/asset-register/assestclass/${assetClassId}`);
    } catch (error) {
      showErrorToast(
        error instanceof Error ? error.message : ASSET_CLASS_SAVE_ERROR,
      );
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
