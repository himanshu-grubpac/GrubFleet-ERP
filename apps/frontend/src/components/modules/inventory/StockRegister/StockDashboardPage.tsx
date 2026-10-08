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
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import DashboardFilters from "@/components/dashboard/DashboardFilters";
import DashboardTable from "@/components/dashboard/DashboardTable";
import DashboardEmptyState from "@/components/dashboard/DashboardEmptyState";
import DashboardTableActions from "@/components/dashboard/DashboardTableActions";
import { useAuth } from "@/providers/auth-provider";
import { dashboardListQueryOptions } from "@/lib/query/dashboard-list-query-options";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import {
  fetchStockRegisterListApi,
  updateSparePartStatusApi,
  type StockRegisterListItem,
} from "@/lib/api/inventory/stock-register";
import {
  showErrorToast,
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

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [filters, setFilters] = useState<Record<string, string>>({
    compatibleClass: "",
    unit: "",
  });
  const [currentPage, setCurrentPage] = useState(1);

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
    ],
    queryFn: () =>
      fetchStockRegisterListApi(
        {
          organizationId: organizationId!,
          page: currentPage,
          pageSize: PAGE_SIZE,
          search: debouncedSearch,
        },
        token!,
      ),
    enabled: !!token && !!organizationId && !isAuthLoading,
    ...dashboardListQueryOptions,
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, filters.compatibleClass]);

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
    onError: () => showErrorToast("Could not update part status."),
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
      render: (part: StockRegisterListItem) => (
        <span className="text-sm text-gray-600">{part.compatibleClass}</span>
      ),
    },
    {
      key: "threshold",
      label: "THRESHOLD",
      render: (part: StockRegisterListItem) => (
        <span className="text-sm text-gray-600">{part.threshold}</span>
      ),
    },
    {
      key: "unit",
      label: "UNIT",
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
                router.push("/inventory/Stock-register/create")
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
          searchValue={search}
          searchPlaceholder="Search by part name or part number"
          onSearchChange={setSearch}
          selectFilters={[
            {
              key: "compatibleClass",
              label: "Compatible Class",
              options: [
                { label: "Both classes", value: "Both classes" },
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
            setSearch("");
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
                router.push("/inventory/Stock-register/create");
                return;
              }
              setSearch("");
              setFilters({ compatibleClass: "", unit: "" });
            }}
          />
        ) : (
          <DashboardTable
            columns={stockColumns}
            data={filteredItems}
            getRowKey={(part) => part.id}
            renderActions={(part) => (
              <DashboardTableActions
                status={part.status}
                locationId={part.id}
                viewHref={`/inventory/Stock-register/${part.id}`}
                onEdit={
                  part.availableActions.edit
                    ? () =>
                        router.push(
                          `/inventory/Stock-register/${part.id}/edit`,
                        )
                    : undefined
                }
                onToggleStatus={() => {
                  setStatusTarget(part);
                  if (part.status === "active") {
                    setDeactivateOpen(true);
                  } else {
                    setActivateOpen(true);
                  }
                }}
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
