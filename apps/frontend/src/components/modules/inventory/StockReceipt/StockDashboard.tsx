"use client";

import { useEffect, useState } from "react";
import { PackagePlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import Button from "@/components/ui/GrubpacButton";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import DashboardFilters from "@/components/dashboard/DashboardFilters";
import DashboardTable from "@/components/dashboard/DashboardTable";
import DashboardEmptyState from "@/components/dashboard/DashboardEmptyState";
import DashboardTableActions from "@/components/dashboard/DashboardTableActions";
import { useAuth } from "@/providers/auth-provider";
import { dashboardListQueryOptions } from "@/lib/query/dashboard-list-query-options";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import {
  fetchStockReceiptsListApi,
  type StockReceiptListItem,
} from "@/lib/api/inventory/stock-receipts";

const PAGE_SIZE = 10;

export default function StockDashboard() {
  const router = useRouter();
  const { token, organizationId, isLoading: isAuthLoading, permissions } =
    useAuth();

  const canCreate =
    permissions.has("inventory.create") ||
    permissions.has("inventory.manage");

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch]);

  const listQuery = useQuery({
    queryKey: [
      "inventory",
      "stock-receipts",
      organizationId,
      currentPage,
      debouncedSearch,
    ],
    queryFn: () =>
      fetchStockReceiptsListApi(
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

  const items = listQuery.data?.items ?? [];
  const totalItems = listQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));

  const columns = [
    {
      key: "date",
      label: "DATE",
      render: (row: StockReceiptListItem) => (
        <span className="text-sm text-gray-600">{row.purchaseDate}</span>
      ),
    },
    {
      key: "part",
      label: "PART",
      render: (row: StockReceiptListItem) => (
        <div>
          <p className="font-medium text-gray-900">{row.partName}</p>
          <p className="text-xs text-gray-500">{row.partNumber}</p>
        </div>
      ),
    },
    {
      key: "quantity",
      label: "QTY",
      render: (row: StockReceiptListItem) => (
        <span className="text-sm text-gray-600">{row.quantity}</span>
      ),
    },
    {
      key: "batch",
      label: "BATCH",
      render: (row: StockReceiptListItem) => (
        <span className="text-sm text-gray-600">{row.batchReference}</span>
      ),
    },
  ];

  return (
    <DashboardLayout
      title="Stock Receipt"
      description="Inbound batches linked to parts, suppliers, and locations."
      action={
        canCreate ? (
          <Button
            type="button"
            onClick={() => router.push("/inventory/stock-receipt/create")}
          >
            + Record Receipt
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
        searchPlaceholder="Search receipts"
        onSearchChange={setSearch}
        selectFilters={[]}
        filterValues={{}}
        onFilterChange={() => undefined}
        onClear={() => {
          setSearch("");
          setCurrentPage(1);
        }}
      />

      {listQuery.isLoading ? (
        <p className="text-sm text-gray-500">Loading receipts…</p>
      ) : listQuery.isError ? (
        <p className="text-sm text-red-600">Failed to load stock receipts.</p>
      ) : items.length === 0 ? (
        <DashboardEmptyState
          icon={<PackagePlus className="h-7 w-7" strokeWidth={1.4} />}
          title={
            totalItems === 0 ? "No stock receipts yet" : "No receipts found"
          }
          description={
            totalItems === 0
              ? "Record your first inbound batch."
              : "Try a different search."
          }
          buttonLabel={
            totalItems === 0 && canCreate ? "Record Receipt" : "Clear search"
          }
          onButtonClick={() => {
            if (totalItems === 0 && canCreate) {
              router.push("/inventory/stock-receipt/create");
              return;
            }
            setSearch("");
          }}
        />
      ) : (
        <DashboardTable
          columns={columns}
          data={items}
          getRowKey={(row) => row.id}
          renderActions={(row) => (
            <DashboardTableActions
              status={row.status}
              locationId={row.id}
              viewHref={`/inventory/stock-receipt/${row.id}`}
              onEdit={
                row.availableActions.edit
                  ? () =>
                      router.push(`/inventory/stock-receipt/${row.id}/edit`)
                  : undefined
              }
            />
          )}
        />
      )}
    </DashboardLayout>
  );
}
