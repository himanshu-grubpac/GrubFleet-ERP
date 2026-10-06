"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PackageSearch } from "lucide-react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import Button from "@/components/ui/GrubpacButton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ReasonRequiredDialog } from "@/components/ui/reason-required-dialog";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import DashboardTable from "@/components/dashboard/DashboardTable";
import DashboardTableActions from "@/components/dashboard/DashboardTableActions";
import DashboardEmptyState from "@/components/dashboard/DashboardEmptyState";
import { useAuth } from "@/providers/auth-provider";
import { dashboardListQueryOptions } from "@/lib/query/dashboard-list-query-options";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { showErrorToast, showSuccessToast } from "@/lib/toast/show-toast";
import {
  fetchAssetRegisterAssetClassesApi,
  updateAssetRegisterAssetClassStatusApi,
  type AssetRegisterAssetClassListItem,
} from "@/lib/api/asset-register/asset-classes";
import { mapAssetRegisterVehicleTypeToUiLabel } from "@/lib/api/asset-register/mappers";

type AssetStatus = "active" | "inactive";

type VehicleType = "2-Wheeler" | "3-Wheeler";

type AssetClass = {
  id: string;
  name: string;
  code: string;
  vehicleType: VehicleType;
  fuelType: string;
  inFleet: number;
  available: number;
  status: AssetStatus;
};

type AssetFilter =
  | "all"
  | "2-wheeler"
  | "3-wheeler"
  | "active"
  | "inactive";

const ASSET_FILTERS: {
  label: string;
  value: AssetFilter;
}[] = [
  { label: "All", value: "all" },
  { label: "2-Wheeler", value: "2-wheeler" },
  { label: "3-Wheeler", value: "3-wheeler" },
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
];

const PAGE_SIZE = 50;

function mapListItem(row: AssetRegisterAssetClassListItem): AssetClass {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    vehicleType: mapAssetRegisterVehicleTypeToUiLabel(row.vehicleType),
    fuelType: row.fuelType,
    inFleet: row.inFleetCount,
    available: row.availableCount ?? 0,
    status: row.status,
  };
}

function filterToApiStatus(
  filter: AssetFilter,
): "active" | "inactive" | undefined {
  if (filter === "active") return "active";
  if (filter === "inactive") return "inactive";
  return undefined;
}

export default function AssetClassesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const {
    token,
    organizationId,
    isLoading: isAuthLoading,
    permissions,
  } = useAuth();

  const canCreate =
    permissions.has("asset_register.create") ||
    permissions.has("asset_register.manage");
  const canUpdate =
    permissions.has("asset_register.update") ||
    permissions.has("asset_register.manage");

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [activeFilter, setActiveFilter] = useState<AssetFilter>("all");
  const [deactivateTarget, setDeactivateTarget] =
    useState<AssetClass | null>(null);
  const [activateTarget, setActivateTarget] = useState<AssetClass | null>(
    null,
  );
  const [statusError, setStatusError] = useState<string | null>(null);

  useEffect(() => {
    setStatusError(null);
  }, [activeFilter, debouncedSearch]);

  const listQuery = useQuery({
    queryKey: [
      "asset-register",
      "asset-classes",
      organizationId,
      debouncedSearch,
      activeFilter,
    ],
    queryFn: () => {
      if (!token || !organizationId) {
        throw new Error("Missing auth context");
      }
      return fetchAssetRegisterAssetClassesApi({
        token,
        organizationId,
        page: 1,
        pageSize: PAGE_SIZE,
        search: debouncedSearch.trim() || undefined,
        status: filterToApiStatus(activeFilter),
      });
    },
    enabled: !!token && !!organizationId && !isAuthLoading,
    ...dashboardListQueryOptions,
  });

  const statusMutation = useMutation({
    mutationFn: async (input: {
      assetClass: AssetClass;
      action: "activate" | "deactivate";
      reason?: string;
    }) => {
      if (!token || !organizationId) {
        throw new Error("Missing auth context");
      }
      return updateAssetRegisterAssetClassStatusApi({
        token,
        organizationId,
        id: input.assetClass.id,
        action: input.action,
        reason: input.reason,
      });
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ["asset-register", "asset-classes"],
      });
      setDeactivateTarget(null);
      setActivateTarget(null);
      setStatusError(null);
      showSuccessToast(
        variables.action === "activate"
          ? "Asset class activated"
          : "Asset class deactivated",
      );
    },
    onError: (error: Error) => {
      const message = error.message || "Could not update asset class status";
      setStatusError(message);
      showErrorToast(message);
    },
  });

  const assetClasses = useMemo(() => {
    const items = (listQuery.data?.items ?? []).map(mapListItem);
    if (activeFilter === "2-wheeler") {
      return items.filter((row) => row.vehicleType === "2-Wheeler");
    }
    if (activeFilter === "3-wheeler") {
      return items.filter((row) => row.vehicleType === "3-Wheeler");
    }
    return items;
  }, [listQuery.data?.items, activeFilter]);

  const isInitialLoading =
    isAuthLoading || (listQuery.isLoading && !listQuery.data);
  const isEmptyOrgList =
    !isInitialLoading &&
    !listQuery.isError &&
    (listQuery.data?.total ?? 0) === 0 &&
    activeFilter === "all" &&
    !debouncedSearch.trim();

  const handleAddAssetClass = () => {
    if (!canCreate) return;
    router.push("/asset-register/assestclass/create");
  };

  const handleEdit = (assetClass: AssetClass) => {
    if (!canUpdate || assetClass.status !== "active") return;
    router.push(`/asset-register/assestclass/${assetClass.id}/edit`);
  };

  const handleClearFilters = () => {
    setSearch("");
    setActiveFilter("all");
  };

  const assetClassColumns = [
    { key: "name", label: "CLASS" },
    { key: "code", label: "CODE" },
    { key: "vehicleType", label: "VEHICLE TYPE" },
    { key: "fuelType", label: "FUEL TYPE" },
    { key: "inFleet", label: "IN FLEET" },
    { key: "available", label: "AVAILABLE" },
    {
      key: "status",
      label: "STATUS",
      render: (assetClass: AssetClass) => (
        <span
          className={[
            "inline-flex rounded-full px-2.5 py-1 text-xs font-medium",
            assetClass.status === "active"
              ? "bg-green-50 text-green-700"
              : "bg-gray-100 text-gray-500",
          ].join(" ")}
        >
          {assetClass.status === "active" ? "Active" : "Inactive"}
        </span>
      ),
    },
  ];

  const addAction = canCreate ? (
    <Button type="button" onClick={handleAddAssetClass}>
      + Add Class
    </Button>
  ) : undefined;

  return (
    <DashboardLayout
      title="Asset Classes"
      description="The master list of vehicle classes offered when adding a vehicle or building a lease contract line."
      activeTab="/asset-register/assestclass"
      action={addAction}
    >
      <div className="mb-4 flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by class name or code"
            className="h-9 w-full rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-gray-300 focus:ring-1 focus:ring-gray-200"
          />
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {ASSET_FILTERS.map((filter) => {
            const isActive = activeFilter === filter.value;
            return (
              <button
                key={filter.value}
                type="button"
                onClick={() => setActiveFilter(filter.value)}
                className={[
                  "h-8 rounded-md border px-3 text-xs font-medium transition-colors",
                  isActive
                    ? "border-gray-900 bg-gray-900 text-white"
                    : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50",
                ].join(" ")}
              >
                {filter.label}
              </button>
            );
          })}
        </div>
      </div>

      {listQuery.isError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          Could not load asset classes.{" "}
          <button
            type="button"
            className="font-medium underline"
            onClick={() => void listQuery.refetch()}
          >
            Retry
          </button>
        </div>
      ) : isInitialLoading ? (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
          Loading asset classes…
        </div>
      ) : isEmptyOrgList ? (
        <DashboardEmptyState
          icon={
            <PackageSearch className="h-7 w-7" strokeWidth={1.4} />
          }
          title="No asset classes added yet"
          description="Add your first asset class to use when adding vehicles or building lease contract lines."
          buttonLabel="Add Class"
          onButtonClick={canCreate ? handleAddAssetClass : undefined}
        />
      ) : assetClasses.length === 0 ? (
        <div className="flex min-h-[180px] flex-col items-center justify-center rounded-lg border border-gray-200 bg-white text-center">
          <PackageSearch
            className="mb-3 h-7 w-7 text-gray-400"
            strokeWidth={1.4}
          />
          <h3 className="text-sm font-semibold text-gray-900">
            No asset classes found
          </h3>
          <p className="mt-1 text-xs text-gray-500">
            Try changing your search or filters.
          </p>
          <button
            type="button"
            onClick={handleClearFilters}
            className="mt-3 text-xs font-medium text-[#FE5720] hover:underline"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <DashboardTable
          columns={assetClassColumns}
          data={assetClasses}
          getRowKey={(assetClass) => assetClass.id}
          renderActions={(assetClass) => (
            <DashboardTableActions
              status={assetClass.status}
              locationId={assetClass.id}
              viewHref={`/asset-register/assestclass/${assetClass.id}`}
              onEdit={
                canUpdate && assetClass.status === "active"
                  ? () => handleEdit(assetClass)
                  : undefined
              }
              onToggleStatus={
                canUpdate
                  ? () => {
                      setStatusError(null);
                      if (assetClass.status === "active") {
                        setDeactivateTarget(assetClass);
                      } else {
                        setActivateTarget(assetClass);
                      }
                    }
                  : undefined
              }
            />
          )}
        />
      )}

      <ConfirmDialog
        open={activateTarget !== null}
        title="Activate asset class?"
        message={
          activateTarget
            ? `${activateTarget.name} will be available for fleet register and lease lines.`
            : "This asset class will be marked active."
        }
        confirmLabel="Activate"
        isConfirmPending={statusMutation.isPending}
        onClose={() => {
          if (!statusMutation.isPending) {
            setActivateTarget(null);
            setStatusError(null);
          }
        }}
        onConfirm={() => {
          if (!activateTarget) return;
          statusMutation.mutate({
            assetClass: activateTarget,
            action: "activate",
          });
        }}
      />

      <ReasonRequiredDialog
        open={deactivateTarget !== null}
        title="Deactivate asset class?"
        description={
          deactivateTarget ? (
            <>
              <span className="font-medium text-gray-900">
                {deactivateTarget.name}
              </span>{" "}
              will no longer be used for new vehicles or lease lines.
            </>
          ) : null
        }
        reasonLabel="Reason for deactivation"
        confirmLabel="Deactivate"
        isPending={statusMutation.isPending}
        error={statusError}
        onClose={() => {
          setDeactivateTarget(null);
          setStatusError(null);
        }}
        onConfirm={(reason) => {
          if (!deactivateTarget) return;
          statusMutation.mutate({
            assetClass: deactivateTarget,
            action: "deactivate",
            reason,
          });
        }}
      />
    </DashboardLayout>
  );
}
