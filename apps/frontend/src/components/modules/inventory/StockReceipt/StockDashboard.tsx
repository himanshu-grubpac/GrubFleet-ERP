"use client";
import { navigateToEntityShell } from "@/lib/navigation/secure-entity-navigation";

import { useCallback, useEffect, useState } from "react";
import { PackagePlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import Button from "@/components/ui/GrubpacButton";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import DashboardFilters from "@/components/dashboard/DashboardFilters";
import DashboardTable from "@/components/dashboard/DashboardTable";
import DashboardEmptyState from "@/components/dashboard/DashboardEmptyState";
import {
  DashboardDetailErrorShell,
  DashboardListLoadingShell,
} from "@/components/dashboard/dashboard-async-states";
import DashboardTableActions from "@/components/dashboard/DashboardTableActions";
import { useAuth } from "@/providers/auth-provider";
import { dashboardListQueryOptions } from "@/lib/query/dashboard-list-query-options";
import { INVENTORY_STOCK_RECEIPT_COLUMN_SORT } from "@/lib/query/dashboard-list-column-sort-maps";
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
  fetchStockReceiptsListApi,
  type StockReceiptListItem,
} from "@/lib/api/inventory/stock-receipts";
import {
  inventoryStockReceiptCreateHref,
  inventoryStockReceiptDetailHref,
  inventoryStockReceiptEditHref,
} from "@/lib/navigation/inventory-static-routes";

const PAGE_SIZE = 10;

export default function StockDashboard() {
  const router = useRouter();
  const { token, organizationId, isLoading: isAuthLoading, permissions } =
    useAuth();

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
  const [currentPage, setCurrentPage] = useState(1);

  const {
    sort: tableSort,
    onSortChange,
    listSortParams,
    serverSorted,
  } = useDashboardTableListSort(INVENTORY_STOCK_RECEIPT_COLUMN_SORT);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, tableSort]);

  const listQuery = useQuery({
    queryKey: [
      "inventory",
      "stock-receipts",
      organizationId,
      currentPage,
      debouncedSearch,
      ...listSortQueryKeyPart(listSortParams),
    ],
    queryFn: () =>
      fetchStockReceiptsListApi(
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
      sortable: false,
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
      sortable: false,
      render: (row: StockReceiptListItem) => (
        <span className="text-sm text-gray-600">{row.quantity}</span>
      ),
    },
    {
      key: "batch",
      label: "BATCH",
      sortable: false,
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
            onClick={() => router.push(inventoryStockReceiptCreateHref)}
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
        searchValue={searchInput}
        searchPlaceholder="Search receipts"
        onSearchChange={onListSearchChange}
        selectFilters={[]}
        filterValues={{}}
        onFilterChange={() => undefined}
        onClear={() => {
          clearSearch();
          setCurrentPage(1);
        }}
      />

      {listQuery.isLoading ? (
        <DashboardListLoadingShell label="Loading receipts…" />
      ) : listQuery.isError ? (
        <DashboardDetailErrorShell
          title="Failed to load stock receipts"
          error={listQuery.error}
          fallbackMessage="Failed to load stock receipts."
          onRetry={() => void listQuery.refetch()}
        />
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
              router.push(inventoryStockReceiptCreateHref);
              return;
            }
            clearSearch();
          }}
        />
      ) : (
        <DashboardTable
          columns={columns}
          data={items}
          getRowKey={(row) => row.id}
          sortState={tableSort}
          onSortChange={onSortChange}
          serverSorted={serverSorted}
          renderActions={(row) => (
            <DashboardTableActions
              status={row.status}
              locationId={row.id}
              navigationEntityId={row.id}
              viewHref={inventoryStockReceiptDetailHref(row.id)}
              copyText={[
                `Date: ${row.purchaseDate}`,
                `Part: ${row.partName}`,
                `Part Number: ${row.partNumber}`,
                `Quantity: ${row.quantity}`,
                `Batch: ${row.batchReference}`,
                `Status: ${row.status}`,
              ].join("\n")}
              onEdit={
                canUpdate && row.availableActions.edit
                  ? () => navigateToEntityShell(router, inventoryStockReceiptEditHref(row.id), row.id, 'push')
                  : undefined
              }
            />
          )}
        />
      )}
    </DashboardLayout>
  );
}
