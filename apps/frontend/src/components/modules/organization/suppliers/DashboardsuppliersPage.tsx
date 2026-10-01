"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, PackageSearch, Smartphone } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import Button from "@/components/ui/GrubpacButton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ReasonRequiredDialog } from "@/components/ui/reason-required-dialog";
import ContactCopyIcon from "@/components/ui/ContactCopyIcon";
import { useAuth } from "@/providers/auth-provider";
import {
  fetchOrganisationSuppliersApi,
  supplierFilterToApiType,
  updateOrganisationSupplierStatusApi,
  type OrganisationSupplierListItem,
} from "@/lib/api/organisation/suppliers";
import { dashboardListQueryOptions } from "@/lib/query/dashboard-list-query-options";
import { ApiClientError } from "@/lib/api/client";
import {
  showErrorToast,
  showSupplierActivatedToast,
  showSupplierDeactivatedToast,
  SUPPLIER_STATUS_UPDATE_ERROR,
} from "@/lib/toast/show-toast";
import { useDashboardListSearch } from "@/lib/hooks/use-dashboard-list-search";

import DashboardFilters from "@/components/dashboard/DashboardFilters";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import DashboardTable from "@/components/dashboard/DashboardTable";
import DashboardViewCopyRowActions from "@/components/dashboard/DashboardViewCopyRowActions";
import DashboardEmptyState from "@/components/dashboard/DashboardEmptyState";
import DashboardTablePagination from "@/components/dashboard/DashboardTablePagination";
import { DASHBOARD_DEFAULT_PAGE_SIZE } from "@/components/dashboard/dashboard-pagination";

type SupplierFilter =
  | "all"
  | "bike"
  | "driver"
  | "spareparts"
  | "compliance";

type Supplier = OrganisationSupplierListItem;

const SUPPLIER_FILTERS: { label: string; value: SupplierFilter }[] = [
  { label: "All", value: "all" },
  { label: "Bike", value: "bike" },
  { label: "Driver", value: "driver" },
  { label: "Spare parts", value: "spareparts" },
  { label: "Compliance", value: "compliance" },
];

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

  const { searchInput, setSearchInput, debouncedSearch } =
    useDashboardListSearch();
  const [page, setPage] = useState(1);
  const [activeFilter, setActiveFilter] = useState<SupplierFilter>("all");
  const [statusFilter, setStatusFilter] = useState("");

  const [deactivateTarget, setDeactivateTarget] = useState<Supplier | null>(
    null,
  );
  const [activateTarget, setActivateTarget] = useState<Supplier | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, activeFilter, statusFilter]);

  const suppliersQuery = useQuery({
    queryKey: [
      "organization",
      "suppliers",
      organizationId,
      debouncedSearch,
      activeFilter,
      statusFilter,
      page,
    ],
    queryFn: () => {
      if (!token || !organizationId) {
        throw new Error("Missing auth context");
      }
      return fetchOrganisationSuppliersApi(token, {
        organizationId,
        page,
        pageSize: DASHBOARD_DEFAULT_PAGE_SIZE,
        search: debouncedSearch.trim() || undefined,
        supplierType: supplierFilterToApiType(activeFilter),
        status:
          statusFilter === "active" || statusFilter === "inactive"
            ? statusFilter
            : undefined,
      });
    },
    enabled: !!token && !!organizationId && !isAuthLoading,
    ...dashboardListQueryOptions,
  });

  const suppliers = suppliersQuery.data?.items ?? [];
  const suppliersTotal = suppliersQuery.data?.total ?? 0;
  const suppliersPage = suppliersQuery.data?.page ?? page;

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
        error instanceof ApiClientError
          ? error.message || SUPPLIER_STATUS_UPDATE_ERROR
          : error.message || SUPPLIER_STATUS_UPDATE_ERROR;
      setStatusError(message);
      showErrorToast(message);
    },
  });

  const handleAddSupplier = () => {
    if (!canCreate) return;
    router.push("/organization/suppliers/create");
  };

  const handleEdit = (supplier: Supplier) => {
    router.push(`/organization/suppliers/${supplier.id}/edit`);
  };

  const supplierColumns = useMemo(
    () => [
      { key: "name", label: "COMPANY" },
      { key: "type", label: "SUPPLIES" },
      { key: "contactPerson", label: "CONTACT PERSON" },
      {
        key: "email",
        label: "EMAIL",
        render: (supplier: Supplier) => (
          <ContactCopyIcon
            value={supplier.email}
            label="email"
            icon={Mail}
          />
        ),
      },
      {
        key: "phone",
        label: "MOBILE",
        render: (supplier: Supplier) => (
          <ContactCopyIcon
            value={supplier.phone}
            label="mobile number"
            icon={Smartphone}
            copyKind="phone"
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
            {supplier.status === "active" ? "Active" : "Inactive"}
          </span>
        ),
      },
    ],
    [],
  );

  const addSupplierAction = canCreate ? (
    <Button type="button" onClick={handleAddSupplier}>
      + Add Supplier
    </Button>
  ) : undefined;

  const handleClearFilters = () => {
    setSearchInput("");
    setActiveFilter("all");
    setStatusFilter("");
  };

  const listHasFilters =
    debouncedSearch.trim().length > 0 ||
    activeFilter !== "all" ||
    statusFilter !== "";

  return (
    <>
      <DashboardLayout
        title="Suppliers"
        description="Shared supplier register — vehicles, spare parts, driver staffing, and insurance/RTO compliance contacts, used across Asset Management and Inventory."
        tabs={[{ label: "Suppliers", href: "/organization/suppliers" }]}
        activeTab="/organization/suppliers"
        action={addSupplierAction}
      >
        <DashboardFilters
          searchValue={searchInput}
          searchPlaceholder="Search by supplier or contact person name"
          onSearchChange={setSearchInput}
          selectFilters={[
            {
              key: "status",
              label: "All statuses",
              options: [
                { label: "Active", value: "active" },
                { label: "Inactive", value: "inactive" },
              ],
            },
          ]}
          filterValues={{ status: statusFilter }}
          onFilterChange={(key, value) => {
            if (key === "status") {
              setStatusFilter(value);
            }
          }}
          onClear={handleClearFilters}
        >
          <div className="flex shrink-0 items-center gap-1.5">
            {SUPPLIER_FILTERS.map((filter) => {
              const isActive = activeFilter === filter.value;
              return (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => setActiveFilter(filter.value)}
                  className={[
                    "h-8 rounded-md border px-3 text-xs font-medium transition-colors",
                    isActive
                      ? "border-[#FE5720] bg-orange-50 text-[#FE5720]"
                      : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50",
                  ].join(" ")}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>
        </DashboardFilters>

        {isInitialLoading ? (
          <div
            className="min-h-[240px] animate-pulse rounded-lg bg-gray-100"
            aria-busy="true"
          />
        ) : suppliersQuery.isError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {suppliersQuery.error instanceof Error
              ? suppliersQuery.error.message
              : "Failed to load suppliers."}
            <button
              type="button"
              onClick={() => suppliersQuery.refetch()}
              className="ml-3 font-medium underline"
            >
              Retry
            </button>
          </div>
        ) : suppliersTotal === 0 && !listHasFilters ? (
          <DashboardEmptyState
            icon={
              <PackageSearch className="h-7 w-7" strokeWidth={1.4} />
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
          <>
            <DashboardTable
              columns={supplierColumns}
              data={suppliers}
              getRowKey={(supplier) => supplier.id}
              renderActions={(supplier) => {
                const isActive = supplier.status === "active";
                return (
                  <DashboardViewCopyRowActions
                    viewHref={`/organization/suppliers/${supplier.id}`}
                    viewAriaLabel="View supplier"
                    copyText={`${supplier.name}\t${supplier.type}\t${supplier.contactPerson}\t${supplier.email}\t${supplier.phone}`}
                    copyAriaLabel="Copy supplier row details"
                    onEdit={
                      canUpdate && isActive
                        ? () => handleEdit(supplier)
                        : undefined
                    }
                    menuAriaLabel="Supplier actions"
                    status={supplier.status}
                    onActivate={
                      canUpdate && !isActive
                        ? () => {
                            setStatusError(null);
                            setActivateTarget(supplier);
                          }
                        : undefined
                    }
                    onDeactivate={
                      canUpdate && isActive
                        ? () => {
                            setStatusError(null);
                            setDeactivateTarget(supplier);
                          }
                        : undefined
                    }
                  />
                );
              }}
            />
            <DashboardTablePagination
              page={suppliersPage}
              pageSize={DASHBOARD_DEFAULT_PAGE_SIZE}
              total={suppliersTotal}
              onPageChange={setPage}
            />
          </>
        )}
      </DashboardLayout>

      <ConfirmDialog
        open={!!activateTarget}
        title="Activate supplier?"
        message={
          activateTarget
            ? `${activateTarget.name} will be marked active in the supplier register.`
            : ""
        }
        confirmLabel="Activate"
        isConfirmPending={statusMutation.isPending}
        onClose={() => {
          if (!statusMutation.isPending) {
            setActivateTarget(null);
            setStatusError(null);
          }
        }}
        onConfirm={async () => {
          if (!activateTarget) return;
          await statusMutation.mutateAsync({
            supplier: activateTarget,
            action: "activate",
          });
        }}
      />

      <ReasonRequiredDialog
        open={!!deactivateTarget}
        title="Deactivate supplier?"
        description={
          deactivateTarget ? (
            <>
              <span className="font-medium text-gray-900">
                {deactivateTarget.name}
              </span>{" "}
              will be marked inactive. Provide a reason — it is recorded in the
              audit log.
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
    </>
  );
}
