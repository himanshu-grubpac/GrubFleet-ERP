"use client";

import { useCallback, useEffect, useState } from "react";
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
import DashboardFilters from "@/components/dashboard/DashboardFilters";
import DashboardTable from "@/components/dashboard/DashboardTable";
import DashboardEmptyState from "@/components/dashboard/DashboardEmptyState";
import DashboardTableActions from "@/components/dashboard/DashboardTableActions";
import { useAuth } from "@/providers/auth-provider";
import { dashboardListQueryOptions } from "@/lib/query/dashboard-list-query-options";
import { INVENTORY_SPARE_PART_COLUMN_SORT } from "@/lib/query/dashboard-list-column-sort-maps";
import {
  listSortQueryKeyPart,
  useDashboardTableListSort,
} from "@/lib/query/dashboard-table-list-sort";
import { useDashboardListSearch } from "@/lib/hooks/use-dashboard-list-search";
import {
  INVENTORY_INPUT_LIMITS,
  sanitizeRestrictedInputValue,
} from "@/lib/forms/restricted-input";
import {
  fetchStockRegisterListApi,
  updateSparePartStatusApi,
  type StockRegisterListItem,
} from "@/lib/api/inventory/stock-register";
import {
  inventoryStockRegisterCreateHref,
  inventoryStockRegisterDetailHref,
  inventoryStockRegisterEditHref,
} from "@/lib/navigation/inventory-static-routes";
import {
  showApiErrorToast,
  showSparePartActivatedToast,
  showSparePartDeactivatedToast,
} from "@/lib/toast/show-toast";

const PAGE_SIZE = 10;

export default function StockDashboardPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const {
    token,
    organizationId,
    isLoading: isAuthLoading,
    permissions,
  } = useAuth();

  const canCreate =
    permissions.has("inventory.create") ||
    permissions.has("inventory.manage");

  const canUpdate =
    permissions.has("inventory.update") ||
    permissions.has("inventory.manage");

  const { searchInput, setSearchInput, debouncedSearch, clearSearch } =
    useDashboardListSearch();

  const onListSearchChange = useCallback(
    (value: string) => {
      setSearchInput(
        sanitizeRestrictedInputValue("text", value, {
          maxLength: INVENTORY_INPUT_LIMITS.listSearch,
        }),
      );
    },
    [setSearchInput],
  );
  const [filters, setFilters] = useState<Record<string, string>>({
    compatibleClass: "",
    unit: "",
  });
  const [currentPage, setCurrentPage] = useState(1);

  const {
    sort: tableSort,
    onSortChange,
    listSortParams,
    serverSorted,
  } = useDashboardTableListSort(INVENTORY_SPARE_PART_COLUMN_SORT);

  const [statusTarget, setStatusTarget] =
    useState<StockRegisterListItem | null>(null);
  const [activateOpen, setActivateOpen] = useState(false);
  const [deactivateOpen, setDeactivateOpen] = useState(false);

  const listQuery = useQuery({
    queryKey: [
      "inventory",
      "stock-register",
      organizationId,
      currentPage,
      debouncedSearch,
      filters.compatibleClass,
      ...listSortQueryKeyPart(listSortParams),
    ],
    queryFn: () =>
      fetchStockRegisterListApi(
        {
          organizationId: organizationId!,
          page: currentPage,
          pageSize: PAGE_SIZE,
          search: debouncedSearch,
          ...listSortParams,
        },
        token!,
      ),
    enabled: !!token && !!organizationId && !isAuthLoading,
    ...dashboardListQueryOptions,
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, filters.compatibleClass, tableSort]);

  const statusMutation = useMutation({
    mutationFn: (input: {
      part: StockRegisterListItem;
      isActive: boolean;
      reason?: string;
    }) =>
      updateSparePartStatusApi(
        organizationId!,
        input.part.id,
        { isActive: input.isActive, reason: input.reason },
        token!,
      ),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ["inventory", "stock-register", organizationId],
      });
      if (variables.isActive) {
        showSparePartActivatedToast(variables.part.partName);
      } else {
        showSparePartDeactivatedToast(variables.part.partName);
      }
      setActivateOpen(false);
      setDeactivateOpen(false);
      setStatusTarget(null);
    },
    onError: (error) =>
      showApiErrorToast(error, "Could not update part status."),
  });

  const items = listQuery.data?.items ?? [];
  const filteredItems = items.filter((part) => {
    if (
      filters.compatibleClass &&
      part.compatibleClass !== filters.compatibleClass
    ) {
      return false;
    }
    if (filters.unit && part.unit !== filters.unit) {
      return false;
    }
    return true;
  });

  const totalItems = listQuery.data?.total ?? 0;
  const totalPages = Math.max(
    1,
    Math.ceil(totalItems / PAGE_SIZE),
  );

  const stockColumns = [
    {
      key: "partName",
      label: "PART",
      render: (part: StockRegisterListItem) => (
        <div>
          <p className="font-medium text-gray-900">{part.partName}</p>
        </div>
      ),
    },
    {
      key: "partNumber",
      label: "PART NO.",
      render: (part: StockRegisterListItem) => (
        <span className="text-sm font-medium text-gray-600">
          {part.partNumber}
        </span>
      ),
    },
    {
      key: "compatibleClass",
      label: "COMPATIBLE CLASS",
      sortable: false,
      render: (part: StockRegisterListItem) => (
        <span className="text-sm text-gray-600">{part.compatibleClass}</span>
      ),
    },
    {
      key: "threshold",
      label: "THRESHOLD",
      sortable: false,
      render: (part: StockRegisterListItem) => (
        <span className="text-sm text-gray-600">{part.threshold}</span>
      ),
    },
    {
      key: "unit",
      label: "UNIT",
      sortable: false,
      render: (part: StockRegisterListItem) => (
        <span className="text-sm text-gray-600">{part.unit}</span>
      ),
    },
  ];

  return (
    <>
      <DashboardLayout
        title="Stock Register"
        description="Every spare part master record, across compatible asset classes."
        action={
          canCreate ? (
            <Button
              type="button"
              onClick={() =>
                router.push(inventoryStockRegisterCreateHref)
              }
            >
              + Add Part
            </Button>
          ) : undefined
        }
        pagination={{
          currentPage,
          totalPages,
          totalItems,
          pageSize: PAGE_SIZE,
          onPageChange: setCurrentPage,
        }}
      >
        <DashboardFilters
          searchValue={searchInput}
          searchPlaceholder="Search by part name or part number"
          onSearchChange={onListSearchChange}
          selectFilters={[
            {
              key: "compatibleClass",
              label: "Compatible Class",
              options: [
                {
                  label: "Petrol Scooter — Standard",
                  value: "Petrol Scooter — Standard",
                },
                {
                  label: "Petrol Auto — Cargo",
                  value: "Petrol Auto — Cargo",
                },
              ],
            },
          ]}
          filterValues={filters}
          onFilterChange={(key, value) => {
            setFilters((previous) => ({
              ...previous,
              [key]: value,
            }));
          }}
          onClear={() => {
            clearSearch();
            setFilters({ compatibleClass: "", unit: "" });
            setCurrentPage(1);
          }}
        />

        {listQuery.isLoading ? (
          <p className="text-sm text-gray-500">Loading stock register…</p>
        ) : listQuery.isError ? (
          <p className="text-sm text-red-600">
            Failed to load stock register.
          </p>
        ) : filteredItems.length === 0 ? (
          <DashboardEmptyState
            icon={
              <PackageSearch className="h-7 w-7" strokeWidth={1.4} />
            }
            title={
              totalItems === 0
                ? "No stock parts added yet"
                : "No stock parts found"
            }
            description={
              totalItems === 0
                ? "Add your first spare part to the stock register."
                : "Try changing your search or filters."
            }
            buttonLabel={
              totalItems === 0 && canCreate ? "Add Part" : "Clear filters"
            }
            onButtonClick={() => {
              if (totalItems === 0 && canCreate) {
                router.push(inventoryStockRegisterCreateHref);
                return;
              }
              clearSearch();
              setFilters({ compatibleClass: "", unit: "" });
            }}
          />
        ) : (
          <DashboardTable
            columns={stockColumns}
            data={filteredItems}
            getRowKey={(part) => part.id}
            sortState={tableSort}
            onSortChange={onSortChange}
            serverSorted={serverSorted}
            renderActions={(part) => (
              <DashboardTableActions
                status={part.status}
                locationId={part.id}
                viewHref={inventoryStockRegisterDetailHref(part.id)}
                copyText={[
                  `Part: ${part.partName}`,
                  `Part Number: ${part.partNumber}`,
                  `Compatible Class: ${part.compatibleClass}`,
                  `Threshold: ${part.threshold}`,
                  `Unit: ${part.unit}`,
                  `Status: ${part.status}`,
                ].join("\n")}
                onEdit={
                  canUpdate && part.availableActions.edit
                    ? () =>
                      router.push(
                        inventoryStockRegisterEditHref(part.id),
                      )
                    : undefined
                }
                onToggleStatus={
                  canUpdate
                    ? () => {
                        setStatusTarget(part);
                        if (part.status === "active") {
                          setDeactivateOpen(true);
                        } else {
                          setActivateOpen(true);
                        }
                      }
                    : undefined
                }
              />
            )}
          />
        )}
      </DashboardLayout>
      <ConfirmDialog
        open={activateOpen}
        title="Activate part?"
        message={
          statusTarget
            ? `${statusTarget.partName} will be available for receipts and requests.`
            : "This part will be marked active."
        }
        confirmLabel="Activate"
        isConfirmPending={statusMutation.isPending}
        onClose={() => {
          if (!statusMutation.isPending) {
            setActivateOpen(false);
            setStatusTarget(null);
          }
        }}
        onConfirm={() => {
          if (!statusTarget) return;
          statusMutation.mutate({
            part: statusTarget,
            isActive: true,
          });
        }}
      />

      <ReasonRequiredDialog
        open={deactivateOpen}
        title="Deactivate part?"
        description={
          statusTarget ? (
            <>
              <span className="font-medium text-gray-900">
                {statusTarget.partName}
              </span>{" "}
              will be hidden from new receipts until reactivated.
            </>
          ) : null
        }
        reasonLabel="Reason for deactivation"
        confirmLabel="Deactivate"
        isPending={statusMutation.isPending}
        onClose={() => {
          setDeactivateOpen(false);
          setStatusTarget(null);
        }}
        onConfirm={(reason) => {
          if (!statusTarget) return;
          statusMutation.mutate({
            part: statusTarget,
            isActive: false,
            reason,
          });
        }}
      />
    </>
  );
}
