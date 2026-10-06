"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import CreateAssetMasterForm, {
  type AssetMasterFormData,
} from "@/components/modules/assetManagement/asset-Master/CreateAssetMasterForm";
import { useAuth } from "@/providers/auth-provider";
import { dashboardListQueryOptions } from "@/lib/query/dashboard-list-query-options";
import { showErrorToast, showSuccessToast } from "@/lib/toast/show-toast";
import {
  fetchAssetRegisterAssetClassApi,
  fetchAssetRegisterAssetClassesApi,
} from "@/lib/api/asset-register/asset-classes";
import {
  fetchAssetRegisterAssetMasterApi,
  updateAssetRegisterAssetMasterApi,
} from "@/lib/api/asset-register/asset-masters";
import {
  assetClassDetailToMasterOption,
  assetMasterDetailToFormData,
} from "@/lib/api/asset-register/mappers";

export default function EditAssetMasterPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { token, organizationId, isLoading: isAuthLoading, permissions } =
    useAuth();

  const assetId = String(params.id);

  const canUpdate =
    permissions.has("asset_register.update") ||
    permissions.has("asset_register.manage");

  const detailQuery = useQuery({
    queryKey: ["asset-register", "asset-masters", organizationId, assetId],
    queryFn: () => {
      if (!token || !organizationId) {
        throw new Error("Missing auth context");
      }
      return fetchAssetRegisterAssetMasterApi({
        token,
        organizationId,
        id: assetId,
      });
    },
    enabled: !!token && !!organizationId && !isAuthLoading,
    ...dashboardListQueryOptions,
  });

  const classesQuery = useQuery({
    queryKey: ["asset-register", "asset-classes", "catalog", organizationId],
    queryFn: async () => {
      if (!token || !organizationId) {
        throw new Error("Missing auth context");
      }
      const res = await fetchAssetRegisterAssetClassesApi({
        token,
        organizationId,
        page: 1,
        pageSize: 50,
        status: "active",
      });
      const details = await Promise.all(
        res.items.map((item) =>
          fetchAssetRegisterAssetClassApi({
            token,
            organizationId,
            id: item.id,
          }),
        ),
      );
      return details.map(assetClassDetailToMasterOption);
    },
    enabled: !!token && !!organizationId && !isAuthLoading && canUpdate,
    ...dashboardListQueryOptions,
  });

  const updateMutation = useMutation({
    mutationFn: async (data: AssetMasterFormData) => {
      if (!token || !organizationId) {
        throw new Error("Missing auth context");
      }
      return updateAssetRegisterAssetMasterApi({
        token,
        organizationId,
        id: assetId,
        name: data.vehicleName.trim(),
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["asset-register", "asset-masters"],
      });
      showSuccessToast("Asset master updated");
      router.push(`/asset-register/asset-master/${assetId}`);
    },
    onError: (error: Error) => {
      showErrorToast(error.message || "Could not update asset master");
    },
  });

  useEffect(() => {
    if (detailQuery.data && !detailQuery.data.isActive) {
      router.replace(`/asset-register/asset-master/${assetId}`);
    }
  }, [detailQuery.data, assetId, router]);

  if (!isAuthLoading && !canUpdate) {
    return (
      <div className="p-6 text-sm text-gray-500">
        You do not have permission to edit asset masters.
      </div>
    );
  }

  if (detailQuery.isError) {
    return (
      <div className="p-6 text-sm text-gray-500">Asset master not found.</div>
    );
  }

  if (
    isAuthLoading ||
    detailQuery.isLoading ||
    classesQuery.isLoading ||
    !detailQuery.data
  ) {
    return (
      <div className="p-6 text-sm text-gray-500">Loading asset master…</div>
    );
  }

  if (!detailQuery.data.isActive) {
    return (
      <div className="p-6 text-sm text-gray-500">Redirecting…</div>
    );
  }

  return (
    <CreateAssetMasterForm
      mode="edit"
      initialData={assetMasterDetailToFormData(detailQuery.data)}
      assetClasses={classesQuery.data ?? []}
      onCancel={() => {
        router.push(`/asset-register/asset-master/${assetId}`);
      }}
      onSaved={async (data) => {
        await updateMutation.mutateAsync(data);
      }}
    />
  );
}
