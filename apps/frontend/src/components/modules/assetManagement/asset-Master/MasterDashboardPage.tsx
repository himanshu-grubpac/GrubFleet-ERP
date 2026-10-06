"use client";

import {
    useMemo,
    useState,
    useEffect,
    useRef,
} from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
    useMutation,
    useQuery,
    useQueryClient,
} from "@tanstack/react-query";
import {
    Copy,
    MoreVertical,
    PackageSearch,
    Pencil,
    Power,
    Search,
} from "lucide-react";

import Button from "@/components/ui/GrubpacButton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ReasonRequiredDialog } from "@/components/ui/reason-required-dialog";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import DashboardTable from "@/components/dashboard/DashboardTable";
import DashboardEmptyState from "@/components/dashboard/DashboardEmptyState";
import { useAuth } from "@/providers/auth-provider";
import { dashboardListQueryOptions } from "@/lib/query/dashboard-list-query-options";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { showErrorToast, showSuccessToast } from "@/lib/toast/show-toast";
import {
    fetchAssetRegisterAssetMastersApi,
    updateAssetRegisterAssetMasterStatusApi,
    type AssetRegisterAssetMasterListItem,
} from "@/lib/api/asset-register/asset-masters";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type AssetMaster = {
    id: string;
    assetCode: string;
    vehicleName: string;
    assetClass: string;
    vehicleType: string;

    fuelType: string;
    mileage: string;
    fuelTankCapacity: string;
    ratedLoadCapacity: string;

    status: "Active" | "Inactive";
};

type HoverPosition = {
    top: number;
    left: number;
};

const PAGE_SIZE = 50;

function mapMasterListItem(row: AssetRegisterAssetMasterListItem): AssetMaster {
    return {
        id: row.id,
        assetCode: row.assetClassCode,
        vehicleName: row.name,
        assetClass: row.assetClassName,
        vehicleType: "2-Wheeler",
        fuelType: "—",
        mileage: "—",
        fuelTankCapacity: "—",
        ratedLoadCapacity: "—",
        status: row.status === "active" ? "Active" : "Inactive",
    };
}

/* -------------------------------------------------------------------------- */
/* Asset Code Hover Card                                                      */
/* -------------------------------------------------------------------------- */

function AssetCodeHoverCard({
    asset,
    position,
}: {
    asset: AssetMaster;
    position: HoverPosition;
}) {
    if (typeof document === "undefined") {
        return null;
    }

    return createPortal(
        <div
            className="pointer-events-none fixed z-[9999] w-[285px] rounded-lg border border-gray-200 bg-white p-3 shadow-lg"
            style={{
                top: position.top,
                left: position.left,
            }}
        >
            {/* Header */}

            <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                    <p className="text-[9px] font-medium uppercase tracking-wide text-gray-400">
                        Asset code
                    </p>

                    <p className="mt-0.5 text-sm font-semibold text-gray-900">
                        {asset.assetCode}
                    </p>
                </div>

                <span
                    className={[
                        "inline-flex items-center rounded-full",
                        "px-2 py-0.5 text-[9px] font-medium",
                        asset.status === "Active"
                            ? "bg-green-50 text-green-700"
                            : "bg-gray-100 text-gray-500",
                    ].join(" ")}
                >
                    {asset.status}
                </span>
            </div>

            {/* Asset Information */}

            <div className="border-t border-gray-100 pt-2.5">
                <p className="mb-2 text-[10px] font-semibold text-gray-800">
                    Asset information
                </p>

                <div className="space-y-2">
                    {/* Vehicle Name */}

                    <div className="flex items-start justify-between gap-4">
                        <span className="shrink-0 text-[9px] text-gray-500">
                            Vehicle name
                        </span>

                        <span className="max-w-[175px] text-right text-[10px] font-medium text-gray-800">
                            {asset.vehicleName}
                        </span>
                    </div>

                    {/* Asset Class */}

                    <div className="flex items-start justify-between gap-4">
                        <span className="shrink-0 text-[9px] text-gray-500">
                            Asset class
                        </span>

                        <span className="max-w-[175px] text-right text-[10px] font-medium text-gray-800">
                            {asset.assetClass}
                        </span>
                    </div>

                    {/* Vehicle Type */}

                    <div className="flex items-center justify-between gap-4">
                        <span className="text-[9px] text-gray-500">
                            Vehicle type
                        </span>

                        <span className="text-[10px] font-medium text-gray-800">
                            {asset.vehicleType}
                        </span>
                    </div>

                    {/* Fuel Type */}

                    <div className="flex items-center justify-between gap-4">
                        <span className="text-[9px] text-gray-500">
                            Fuel type
                        </span>

                        <span className="text-[10px] font-medium text-gray-800">
                            {asset.fuelType}
                        </span>
                    </div>

                    {/* Mileage */}

                    <div className="flex items-center justify-between gap-4">
                        <span className="text-[9px] text-gray-500">
                            Mileage
                        </span>

                        <span className="text-[10px] font-medium text-gray-800">
                            {asset.mileage}
                        </span>
                    </div>

                    {/* Fuel Tank */}

                    <div className="flex items-center justify-between gap-4">
                        <span className="text-[9px] text-gray-500">
                            Fuel tank
                        </span>

                        <span className="text-[10px] font-medium text-gray-800">
                            {asset.fuelTankCapacity}
                        </span>
                    </div>

                    {/* Rated Load */}

                    <div className="flex items-center justify-between gap-4">
                        <span className="text-[9px] text-gray-500">
                            Rated load
                        </span>

                        <span className="text-[10px] font-medium text-gray-800">
                            {asset.ratedLoadCapacity}
                        </span>
                    </div>
                </div>
            </div>
        </div>,
        document.body,
    );
}

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export default function AssetMasterDashboardPage() {
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

    /* ---------------------------------------------------------------------- */
    /* Search                                                                 */
    /* ---------------------------------------------------------------------- */

    const [search, setSearch] = useState("");
    const debouncedSearch = useDebouncedValue(search, 300);

    /* ---------------------------------------------------------------------- */
    /* Actions                                                                */
    /* ---------------------------------------------------------------------- */

    const [openActionId, setOpenActionId] = useState<string | null>(
        null,
    );

    /* ---------------------------------------------------------------------- */
    /* Pagination                                                             */
    /* ---------------------------------------------------------------------- */

    const [currentPage, setCurrentPage] = useState(1);

    const pageSize = PAGE_SIZE;

    const [deactivateTarget, setDeactivateTarget] =
        useState<AssetMaster | null>(null);
    const [activateTarget, setActivateTarget] =
        useState<AssetMaster | null>(null);
    const [statusError, setStatusError] = useState<string | null>(
        null,
    );

    const listQuery = useQuery({
        queryKey: [
            "asset-register",
            "asset-masters",
            organizationId,
            debouncedSearch,
            currentPage,
        ],
        queryFn: () => {
            if (!token || !organizationId) {
                throw new Error("Missing auth context");
            }
            return fetchAssetRegisterAssetMastersApi({
                token,
                organizationId,
                page: currentPage,
                pageSize: PAGE_SIZE,
                search: debouncedSearch.trim() || undefined,
            });
        },
        enabled: !!token && !!organizationId && !isAuthLoading,
        ...dashboardListQueryOptions,
    });

    const statusMutation = useMutation({
        mutationFn: async (input: {
            asset: AssetMaster;
            action: "activate" | "deactivate";
            reason?: string;
        }) => {
            if (!token || !organizationId) {
                throw new Error("Missing auth context");
            }
            return updateAssetRegisterAssetMasterStatusApi({
                token,
                organizationId,
                id: input.asset.id,
                action: input.action,
                reason: input.reason,
            });
        },
        onSuccess: (_data, variables) => {
            void queryClient.invalidateQueries({
                queryKey: ["asset-register", "asset-masters"],
            });
            setDeactivateTarget(null);
            setActivateTarget(null);
            setStatusError(null);
            showSuccessToast(
                variables.action === "activate"
                    ? "Asset master activated"
                    : "Asset master deactivated",
            );
        },
        onError: (error: Error) => {
            const message =
                error.message || "Could not update asset master status";
            setStatusError(message);
            showErrorToast(message);
        },
    });

    /* ---------------------------------------------------------------------- */
    /* Hover Card                                                             */
    /* ---------------------------------------------------------------------- */

    const [hoveredAsset, setHoveredAsset] =
        useState<AssetMaster | null>(null);

    const [hoverPosition, setHoverPosition] =
        useState<HoverPosition | null>(null);

    const hoverTimeoutRef = useRef<ReturnType<
        typeof setTimeout
    > | null>(null);

    /* ---------------------------------------------------------------------- */
    /* Navigation                                                             */
    /* ---------------------------------------------------------------------- */

    const handleAddAsset = () => {
        if (!canCreate) return;
        router.push("/asset-register/asset-master/create");
    };

    const handleViewAsset = (asset: AssetMaster) => {
        router.push(`/asset-register/asset-master/${asset.id}`);
    };

    const handleEditAsset = (asset: AssetMaster) => {
        if (!canUpdate || asset.status !== "Active") return;
        router.push(
            `/asset-register/asset-master/${asset.id}/edit`,
        );
    };

    /* ---------------------------------------------------------------------- */
    /* Toggle Status                                                          */
    /* ---------------------------------------------------------------------- */

    const handleToggleStatus = (asset: AssetMaster) => {
        if (!canUpdate) return;
        setStatusError(null);
        if (asset.status === "Active") {
            setDeactivateTarget(asset);
        } else {
            setActivateTarget(asset);
        }
    };

    /* ---------------------------------------------------------------------- */
    /* Copy Asset Code                                                        */
    /* ---------------------------------------------------------------------- */

    const handleCopyAssetCode = async (
        asset: AssetMaster,
    ) => {
        try {
            await navigator.clipboard.writeText(
                asset.assetCode,
            );
        } catch {
            console.error("Unable to copy asset code");
        }
    };

    /* ---------------------------------------------------------------------- */
    /* Hover Handlers                                                         */
    /* ---------------------------------------------------------------------- */

    const handleAssetCodeMouseEnter = (
        event: React.MouseEvent<HTMLSpanElement>,
        asset: AssetMaster,
    ) => {
        if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
        }

        const rect =
            event.currentTarget.getBoundingClientRect();

        setHoverPosition({
            top: rect.bottom + 8,
            left: rect.left,
        });

        setHoveredAsset(asset);
    };

    const handleAssetCodeMouseLeave = () => {
        if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
        }

        hoverTimeoutRef.current = setTimeout(() => {
            setHoveredAsset(null);
            setHoverPosition(null);
        }, 80);
    };

    /* ---------------------------------------------------------------------- */
    /* Cleanup Hover Timeout                                                  */
    /* ---------------------------------------------------------------------- */

    useEffect(() => {
        return () => {
            if (hoverTimeoutRef.current) {
                clearTimeout(hoverTimeoutRef.current);
            }
        };
    }, []);

    /* ---------------------------------------------------------------------- */
    /* Filtering                                                              */
    /* ---------------------------------------------------------------------- */

    const paginatedAssets = useMemo(
        () => (listQuery.data?.items ?? []).map(mapMasterListItem),
        [listQuery.data?.items],
    );

    const totalItems = listQuery.data?.total ?? 0;
    const totalPages = Math.max(
        1,
        listQuery.data?.totalPages ?? 1,
    );
    const safeCurrentPage = currentPage;

    useEffect(() => {
        setCurrentPage(1);
    }, [debouncedSearch]);

    const isInitialLoading =
        isAuthLoading || (listQuery.isLoading && !listQuery.data);
    const isEmptyOrgList =
        !isInitialLoading &&
        !listQuery.isError &&
        totalItems === 0 &&
        !debouncedSearch.trim();

    /* ---------------------------------------------------------------------- */
    /* Clear Search                                                           */
    /* ---------------------------------------------------------------------- */

    const handleClearSearch = () => {
        setSearch("");
        setCurrentPage(1);
    };

    /* ---------------------------------------------------------------------- */
    /* Table Columns                                                          */
    /* ---------------------------------------------------------------------- */

    const assetMasterColumns = [
        {
            key: "assetCode",
            label: "ASSET CODE",

            render: (asset: AssetMaster) => (
                <span
                    onMouseEnter={(event) =>
                        handleAssetCodeMouseEnter(
                            event,
                            asset,
                        )
                    }
                    onMouseLeave={
                        handleAssetCodeMouseLeave
                    }
                    className="cursor-default font-medium text-[#FE5720] transition-colors duration-150"
                >
                    {asset.assetCode}
                </span>
            ),
        },

        {
            key: "vehicleName",
            label: "VEHICLE NAME",

            render: (asset: AssetMaster) => (
                <span className="font-medium text-gray-900">
                    {asset.vehicleName}
                </span>
            ),
        },

        {
            key: "assetClass",
            label: "ASSET CLASS",

            render: (asset: AssetMaster) => (
                <span className="text-gray-700">
                    {asset.assetClass}
                </span>
            ),
        },

        {
            key: "vehicleType",
            label: "VEHICLE TYPE",

            render: (asset: AssetMaster) => (
                <span className="text-gray-700">
                    {asset.vehicleType}
                </span>
            ),
        },

        {
            key: "status",
            label: "STATUS",

            render: (asset: AssetMaster) => (
                <span
                    className={
                        asset.status === "Active"
                            ? "inline-flex rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-semibold text-green-700"
                            : "inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500"
                    }
                >
                    {asset.status}
                </span>
            ),
        },
    ];

    /* ---------------------------------------------------------------------- */
    /* Render                                                                 */
    /* ---------------------------------------------------------------------- */

    return (
        <>
            <DashboardLayout
                title="Asset Master"
                description="Manage vehicles and their asset class associations."
                pagination={{
                    currentPage: safeCurrentPage,
                    totalPages,
                    totalItems,
                    pageSize,
                    onPageChange: setCurrentPage,
                }}
            >
                {/* ========================================================== */}
                {/* SEARCH + ADD ASSET                                           */}
                {/* ========================================================== */}

                <div className="mb-4 flex items-center gap-3">
                    <div className="relative min-w-0 flex-1">
                        <Search
                            className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400"
                            strokeWidth={1.8}
                        />

                        <input
                            type="text"
                            value={search}
                            onChange={(event) =>
                                setSearch(
                                    event.target.value,
                                )
                            }
                            placeholder="Search by asset code, vehicle name or asset class"
                            className="h-9 w-full rounded-md border border-gray-200 bg-white pl-9 pr-3 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-gray-300 focus:ring-1 focus:ring-gray-200"
                        />
                    </div>

                    {canCreate ? (
                        <Button
                            type="button"
                            onClick={handleAddAsset}
                            className="h-9 shrink-0 px-4 text-xs"
                        >
                            Add Asset
                        </Button>
                    ) : null}
                </div>

                {/* ========================================================== */}
                {/* EMPTY / SEARCH RESULT / TABLE                              */}
                {/* ========================================================== */}

                {listQuery.isError ? (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                        Could not load asset masters.{" "}
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
                        Loading asset masters…
                    </div>
                ) : isEmptyOrgList ? (
                    <DashboardEmptyState
                        icon={
                            <PackageSearch
                                className="h-7 w-7"
                                strokeWidth={1.4}
                            />
                        }
                        title="No assets found"
                        description="There are currently no assets in the asset master."
                        buttonLabel="Add Asset"
                        onButtonClick={
                            canCreate ? handleAddAsset : undefined
                        }
                    />
                ) : paginatedAssets.length === 0 ? (
                    <div className="flex min-h-[180px] flex-col items-center justify-center rounded-lg border border-gray-200 bg-white text-center">
                        <PackageSearch
                            className="mb-3 h-7 w-7 text-gray-400"
                            strokeWidth={1.4}
                        />

                        <h3 className="text-sm font-semibold text-gray-900">
                            No assets found
                        </h3>

                        <p className="mt-1 text-xs text-gray-500">
                            Try changing your search.
                        </p>

                        <button
                            type="button"
                            onClick={
                                handleClearSearch
                            }
                            className="mt-3 text-xs font-medium text-[#FE5720] hover:underline"
                        >
                            Clear search
                        </button>
                    </div>
                ) : (
                    <DashboardTable
                        columns={assetMasterColumns}
                        data={paginatedAssets}
                        getRowKey={(asset) =>
                            asset.id
                        }
                        renderActions={(asset) => (
                            <div className="relative flex items-center justify-end gap-4">
                                {/* View */}

                                <button
                                    type="button"
                                    onClick={() =>
                                        handleViewAsset(
                                            asset,
                                        )
                                    }
                                    className="text-sm font-medium text-[#FE5720] hover:underline"
                                >
                                    View
                                </button>

                                {/* Copy */}

                                <button
                                    type="button"
                                    aria-label="Copy asset code"
                                    onClick={() =>
                                        handleCopyAssetCode(
                                            asset,
                                        )
                                    }
                                    className="flex items-center justify-center text-gray-500 hover:text-gray-700"
                                >
                                    <Copy
                                        className="h-4 w-4"
                                        strokeWidth={
                                            1.5
                                        }
                                    />
                                </button>

                                {/* More */}

                                <button
                                    type="button"
                                    aria-label="More actions"
                                    onClick={() =>
                                        setOpenActionId(
                                            openActionId ===
                                                asset.id
                                                ? null
                                                : asset.id,
                                        )
                                    }
                                    className="flex items-center justify-center text-gray-600 hover:text-gray-900"
                                >
                                    <MoreVertical
                                        className="h-4 w-4"
                                        strokeWidth={
                                            1.8
                                        }
                                    />
                                </button>

                                {/* Action Menu */}

                                {openActionId ===
                                    asset.id && (
                                        <div className="absolute right-0 top-7 z-50 w-40 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                                            {canUpdate &&
                                            asset.status ===
                                                "Active" ? (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setOpenActionId(
                                                            null,
                                                        );

                                                        handleEditAsset(
                                                            asset,
                                                        );
                                                    }}
                                                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                                                >
                                                    <Pencil
                                                        className="h-4 w-4 text-gray-500"
                                                        strokeWidth={
                                                            1.7
                                                        }
                                                    />

                                                    <span>
                                                        Edit
                                                    </span>
                                                </button>
                                            ) : null}

                                            {canUpdate ? (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setOpenActionId(
                                                        null,
                                                    );

                                                    handleToggleStatus(
                                                        asset,
                                                    );
                                                }}
                                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                                            >
                                                <Power
                                                    className="h-4 w-4 text-gray-500"
                                                    strokeWidth={
                                                        1.7
                                                    }
                                                />

                                                <span>
                                                    {asset.status ===
                                                        "Active"
                                                        ? "Deactivate"
                                                        : "Activate"}
                                                </span>
                                            </button>
                                            ) : null}
                                        </div>
                                    )}
                            </div>
                        )}
                    />
                )}
            </DashboardLayout>

            <ConfirmDialog
                open={activateTarget !== null}
                title="Activate this asset?"
                message={
                    activateTarget
                        ? `${activateTarget.vehicleName} will be available for fleet register again.`
                        : "This asset will be marked active."
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
                        asset: activateTarget,
                        action: "activate",
                    });
                }}
            />

            <ReasonRequiredDialog
                open={deactivateTarget !== null}
                title="Deactivate this asset?"
                description={
                    deactivateTarget ? (
                        <>
                            <span className="font-medium text-gray-900">
                                {deactivateTarget.vehicleName}
                            </span>{" "}
                            will no longer be available for new fleet
                            vehicles.
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
                        asset: deactivateTarget,
                        action: "deactivate",
                        reason,
                    });
                }}
            />

            {/* ============================================================== */}
            {/* HOVER PREVIEW                                                   */}
            {/* ============================================================== */}

            {hoveredAsset &&
                hoverPosition && (
                    <AssetCodeHoverCard
                        asset={hoveredAsset}
                        position={hoverPosition}
                    />
                )}
        </>
    );
}