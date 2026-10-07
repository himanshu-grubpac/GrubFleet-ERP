"use client";

import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import CreateAssetMasterForm, {
  type AssetMasterFormData,
} from "@/components/modules/assetManagement/asset-Master/CreateAssetMasterForm";
import { useAuth } from "@/providers/auth-provider";
import { dashboardListQueryOptions } from "@/lib/query/dashboard-list-query-options";
import {
  ASSET_MASTER_CREATE_ERROR,
  showAssetMasterCreatedToast,
  showErrorToast,
} from "@/lib/toast/show-toast";
import {
  fetchAssetRegisterAssetClassApi,
  fetchAssetRegisterAssetClassesApi,
} from "@/lib/api/asset-register/asset-classes";
import { createAssetRegisterAssetMasterApi } from "@/lib/api/asset-register/asset-masters";
import { assetClassDetailToMasterOption } from "@/lib/api/asset-register/mappers";

export default function AssetMasterCreatePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { token, organizationId, isLoading: isAuthLoading, permissions } =
    useAuth();

  const canCreate =
    permissions.has("asset_register.create") ||
    permissions.has("asset_register.manage");

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
    enabled: !!token && !!organizationId && !isAuthLoading && canCreate,
    ...dashboardListQueryOptions,
  });

  const createMutation = useMutation({
    mutationFn: async (data: AssetMasterFormData) => {
      if (!token || !organizationId) {
        throw new Error("Missing auth context");
      }
      return createAssetRegisterAssetMasterApi({
        token,
        organizationId,
        assetClassId: data.assetClassId,
        name: data.vehicleName.trim(),
      });
    },
    onSuccess: (created) => {
      void queryClient.invalidateQueries({
        queryKey: ["asset-register", "asset-masters"],
      });
      showAssetMasterCreatedToast();
      router.push(`/asset-register/asset-master/${created.id}`);
    },
    onError: (error: Error) => {
      showErrorToast(error.message || ASSET_MASTER_CREATE_ERROR);
    },
  });

  const assetClassOptions = useMemo(
    () => classesQuery.data ?? [],
    [classesQuery.data],
  );

  if (!isAuthLoading && !canCreate) {
    return (
      <div className="p-6 text-sm text-gray-500">
        You do not have permission to create asset masters.
      </div>
    );
  }

  if (classesQuery.isError) {
    return (
      <div className="p-6 text-sm text-red-700">
        Could not load asset classes.{" "}
        <button
          type="button"
          className="underline"
          onClick={() => void classesQuery.refetch()}
        >
          Retry
        </button>
      </div>
    );
  }

  if (isAuthLoading || classesQuery.isLoading) {
    return (
      <div className="p-6 text-sm text-gray-500">Loading asset classes…</div>
    );
  }

  return (
    <CreateAssetMasterForm
      assetClasses={assetClassOptions}
      onSaved={async (data) => {
        await createMutation.mutateAsync(data);
      }}
    />
  );
}
