"use client";

import { useEffect, useState } from "react";
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
import { useAuth } from "@/providers/auth-provider";
import { dashboardListQueryOptions } from "@/lib/query/dashboard-list-query-options";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import {
    SUPPLIER_STATUS_UPDATE_ERROR,
    showErrorToast,
    showSupplierActivatedToast,
    showSupplierDeactivatedToast,
} from "@/lib/toast/show-toast";
import {
    fetchOrganisationSuppliersApi,
    updateOrganisationSupplierStatusApi,
    type OrganisationSupplierListItem,
    type ListOrganisationSuppliersParams,
} from "@/lib/api/organisation/suppliers";

import DashboardLayout from "@/components/dashboard/DashboardLayout";
import DashboardTable from "@/components/dashboard/DashboardTable";
import DashboardTableActions from "@/components/dashboard/DashboardTableActions";
import DashboardEmptyState from "@/components/dashboard/DashboardEmptyState";
import DashboardContact from "@/components/dashboard/DashboardContact";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type SupplierFilter =
    | "all"
    | "vehicles"
    | "parts"
    | "drivers"
    | "compliance";

type Supplier = OrganisationSupplierListItem;

const SUPPLIERS_PAGE_SIZE = 10;

const SUPPLIER_FILTERS: {
    label: string;
    value: SupplierFilter;
}[] = [
    { label: "All", value: "all" },
    { label: "Vehicles", value: "vehicles" },
    { label: "Parts", value: "parts" },
    { label: "Drivers", value: "drivers" },
    { label: "Compliance", value: "compliance" },
];

function uiFilterToApiType(
    filter: SupplierFilter,
): ListOrganisationSuppliersParams["supplierType"] | undefined {
    switch (filter) {
        case "vehicles":
            return "bike";
        case "parts":
            return "spareparts";
        case "drivers":
            return "driver";
        case "compliance":
            return "compliance";
        default:
            return undefined;
    }
}

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export default function SuppliersPage() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const {
        token,
        organizationId,
        isLoading: isAuthLoading,
        permissions,
    } = useAuth();

    const canCreate =
        permissions.has("organisation.create") ||
        permissions.has("organisation.manage");

    const canUpdate =
        permissions.has("organisation.update") ||
        permissions.has("organisation.manage");

    const [search, setSearch] = useState("");
    const debouncedSearch = useDebouncedValue(search, 300);
    const [activeFilter, setActiveFilter] =
        useState<SupplierFilter>("all");
    const [page, setPage] = useState(1);

    const [deactivateTarget, setDeactivateTarget] =
        useState<Supplier | null>(null);
    const [activateTarget, setActivateTarget] = useState<Supplier | null>(
        null,
    );
    const [statusError, setStatusError] = useState<string | null>(null);

    useEffect(() => {
        setPage(1);
    }, [debouncedSearch, activeFilter]);

    const suppliersQuery = useQuery({
        queryKey: [
            "organization",
            "suppliers",
            organizationId,
            debouncedSearch,
            activeFilter,
            page,
        ],
        queryFn: () => {
            if (!token || !organizationId) {
                throw new Error("Missing auth context");
            }
            return fetchOrganisationSuppliersApi(token, {
                organizationId,
                page,
                pageSize: SUPPLIERS_PAGE_SIZE,
                search: debouncedSearch.trim() || undefined,
                supplierType: uiFilterToApiType(activeFilter),
            });
        },
        enabled: !!token && !!organizationId && !isAuthLoading,
        ...dashboardListQueryOptions,
    });

    const suppliers = suppliersQuery.data?.items ?? [];
    const suppliersTotal = suppliersQuery.data?.total ?? 0;
    const totalPages = Math.max(
        1,
        Math.ceil(suppliersTotal / SUPPLIERS_PAGE_SIZE),
    );

    const isInitialLoading =
        isAuthLoading ||
        (suppliersQuery.isLoading && !suppliersQuery.data);

    const statusMutation = useMutation({
        mutationFn: async (input: {
            supplier: Supplier;
            action: "activate" | "deactivate";
            reason?: string;
        }) => {
            if (!token || !organizationId) {
                throw new Error("Missing auth context");
            }
            return updateOrganisationSupplierStatusApi(
                token,
                organizationId,
                input.supplier.id,
                { action: input.action, reason: input.reason },
            );
        },
        onSuccess: (_data, variables) => {
            void queryClient.invalidateQueries({
                queryKey: ["organization", "suppliers"],
            });
            setDeactivateTarget(null);
            setActivateTarget(null);
            setStatusError(null);
            if (variables.action === "activate") {
                showSupplierActivatedToast(variables.supplier.name);
            } else {
                showSupplierDeactivatedToast(variables.supplier.name);
            }
        },
        onError: (error: Error) => {
            const message =
                error.message || SUPPLIER_STATUS_UPDATE_ERROR;
            setStatusError(message);
            showErrorToast(message);
        },
    });

    const handleAddSupplier = () => {
        if (!canCreate) return;
        router.push("/organization/suppliers/create");
    };

    const addSupplierAction = canCreate ? (
        <Button type="button" onClick={handleAddSupplier}>
            + Add Supplier
        </Button>
    ) : undefined;

    const handleEdit = (supplier: Supplier) => {
        router.push(`/organization/suppliers/${supplier.id}/edit`);
    };

    const handleClearFilters = () => {
        setSearch("");
        setActiveFilter("all");
    };

    const handleActivate = (supplier: Supplier) => {
        setStatusError(null);
        setActivateTarget(supplier);
    };

    const handleDeactivate = (supplier: Supplier) => {
        setStatusError(null);
        setDeactivateTarget(supplier);
    };

    const supplierColumns = [
        { key: "name", label: "COMPANY" },
        { key: "type", label: "SUPPLIES" },
        { key: "contactPerson", label: "CONTACT PERSON" },
        {
            key: "contact",
            label: "CONTACT",
            render: (supplier: Supplier) => (
                <DashboardContact
                    phone={supplier.phone}
                    email={supplier.email}
                />
            ),
        },
        {
            key: "status",
            label: "STATUS",
            render: (supplier: Supplier) => (
                <span
                    className={[
                        "inline-flex rounded-full px-2.5 py-1 text-xs font-medium",
                        supplier.status === "active"
                            ? "bg-green-50 text-green-700"
                            : "bg-gray-100 text-gray-500",
                    ].join(" ")}
                >
                    {supplier.status === "active"
                        ? "Active"
                        : "Inactive"}
                </span>
            ),
        },
    ];

    if (isInitialLoading) {
        return (
            <DashboardLayout
                title="Suppliers"
                description="Shared supplier register — vehicles, spare parts, driver staffing, and insurance/RTO compliance contacts,
             used across Asset Management and Inventory."
                activeTab="/organization/suppliers"
                action={addSupplierAction}
            >
                <div className="flex min-h-[180px] items-center justify-center rounded-lg border border-gray-200 bg-white">
                    <p className="text-sm text-gray-500">
                        Loading suppliers...
                    </p>
                </div>
            </DashboardLayout>
        );
    }

    if (suppliersQuery.isError) {
        return (
            <DashboardLayout
                title="Suppliers"
                description="Shared supplier register — vehicles, spare parts, driver staffing, and insurance/RTO compliance contacts,
             used across Asset Management and Inventory."
                activeTab="/organization/suppliers"
                action={addSupplierAction}
            >
                <div className="flex min-h-[180px] flex-col items-center justify-center rounded-lg border border-red-100 bg-white">
                    <p className="text-sm font-medium text-red-600">
                        Failed to load suppliers.
                    </p>
                    <button
                        type="button"
                        onClick={() => void suppliersQuery.refetch()}
                        className="mt-2 text-sm text-gray-600 underline"
                    >
                        Try again
                    </button>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout
            title="Suppliers"
            description="Shared supplier register — vehicles, spare parts, driver staffing, and insurance/RTO compliance contacts,
             used across Asset Management and Inventory."
            activeTab="/organization/suppliers"
            action={addSupplierAction}
            pagination={
                suppliersTotal > SUPPLIERS_PAGE_SIZE
                    ? {
                          currentPage: page,
                          totalPages,
                          totalItems: suppliersTotal,
                          pageSize: SUPPLIERS_PAGE_SIZE,
                          onPageChange: setPage,
                      }
                    : undefined
            }
        >
            <div className="mb-4 flex items-center gap-3">
                <div className="min-w-0 flex-1">
                    <input
                        type="text"
                        value={search}
                        onChange={(event) =>
                            setSearch(event.target.value)
                        }
                        placeholder="Search by supplier or contact person name"
                        className="h-9 w-full rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-gray-300 focus:ring-1 focus:ring-gray-200"
                    />
                </div>

                <div className="flex shrink-0 items-center gap-1.5">
                    {SUPPLIER_FILTERS.map((filter) => {
                        const isActive =
                            activeFilter === filter.value;

                        return (
                            <button
                                key={filter.value}
                                type="button"
                                onClick={() =>
                                    setActiveFilter(filter.value)
                                }
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

            {suppliersTotal === 0 ? (
                <DashboardEmptyState
                    icon={
                        <PackageSearch
                            className="h-7 w-7"
                            strokeWidth={1.4}
                        />
                    }
                    title="No suppliers added yet"
                    description="Add your first vehicle, parts, driver-staffing, or compliance-authority supplier."
                    buttonLabel="Add Supplier"
                    onButtonClick={handleAddSupplier}
                />
            ) : suppliers.length === 0 ? (
                <div className="flex min-h-[180px] flex-col items-center justify-center rounded-lg border border-gray-200 bg-white text-center">
                    <PackageSearch
                        className="mb-3 h-7 w-7 text-gray-400"
                        strokeWidth={1.4}
                    />
                    <h3 className="text-sm font-semibold text-gray-900">
                        No suppliers found
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
                    columns={supplierColumns}
                    data={suppliers}
                    getRowKey={(supplier) => supplier.id}
                    renderActions={(supplier) => (
                        <DashboardTableActions
                            status={supplier.status}
                            locationId={supplier.id}
                            viewHref={`/organization/suppliers/${supplier.id}`}
                            onEdit={
                                canUpdate && supplier.status === "active"
                                    ? () => handleEdit(supplier)
                                    : undefined
                            }
                            onToggleStatus={
                                canUpdate
                                    ? () =>
                                          supplier.status === "active"
                                              ? handleDeactivate(supplier)
                                              : handleActivate(supplier)
                                    : undefined
                            }
                        />
                    )}
                />
            )}

            <ConfirmDialog
                open={activateTarget !== null}
                title="Activate supplier?"
                message={
                    activateTarget
                        ? `${activateTarget.name} will be marked active and available for use across the organisation.`
                        : "This supplier will be marked active."
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
                    void statusMutation.mutateAsync({
                        supplier: activateTarget,
                        action: "activate",
                    });
                }}
            />

            <ReasonRequiredDialog
                open={deactivateTarget !== null}
                title="Deactivate supplier?"
                description={
                    deactivateTarget ? (
                        <>
                            <span className="font-medium text-gray-900">
                                {deactivateTarget.name}
                            </span>{" "}
                            will be marked inactive. Provide a reason — it is
                            recorded in the audit log.
                        </>
                    ) : null
                }
                reasonLabel="Reason for deactivation"
                reasonPlaceholder="Reason for deactivation"
                confirmLabel="Deactivate"
                pendingLabel="Deactivating..."
                isPending={statusMutation.isPending}
                error={statusError}
                onClose={() => {
                    setDeactivateTarget(null);
                    setStatusError(null);
                }}
                onConfirm={(reason) => {
                    if (!deactivateTarget) return;
                    void statusMutation.mutateAsync({
                        supplier: deactivateTarget,
                        action: "deactivate",
                        reason,
                    });
                }}
            />
        </DashboardLayout>
    );
}
