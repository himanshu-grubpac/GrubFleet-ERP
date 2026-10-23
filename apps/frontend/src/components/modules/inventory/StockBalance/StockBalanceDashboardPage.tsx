"use client";

import { useCallback, useEffect, useState } from "react";
import { PackageSearch } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import DashboardLayout from "@/components/dashboard/DashboardLayout";
import DashboardFilters from "@/components/dashboard/DashboardFilters";
import DashboardTable from "@/components/dashboard/DashboardTable";
import DashboardEmptyState from "@/components/dashboard/DashboardEmptyState";
import { useAuth } from "@/providers/auth-provider";
import { dashboardListQueryOptions } from "@/lib/query/dashboard-list-query-options";
import { INVENTORY_STOCK_BALANCE_COLUMN_SORT } from "@/lib/query/dashboard-list-column-sort-maps";
import {
  listSortQueryKeyPart,
  useDashboardTableListSort,
} from "@/lib/query/dashboard-table-list-sort";
import { useDashboardListSearch } from "@/lib/hooks/use-dashboard-list-search";
import {
  INVENTORY_INPUT_LIMITS,
  sanitizeRestrictedInputValue,
} from "@/lib/forms/restricted-input";
import DashboardTableActions from "@/components/dashboard/DashboardTableActions";
import {
  fetchStockBalanceListApi,
  type StockBalanceListItem,
} from "@/lib/api/inventory/stock-balance";
import { inventoryStockBalanceDetailHref } from "@/lib/navigation/inventory-static-routes";

const PAGE_SIZE = 10;

export default function StockBalanceDashboardPage() {
  const { token, organizationId, isLoading: isAuthLoading } = useAuth();
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
  } = useDashboardTableListSort(INVENTORY_STOCK_BALANCE_COLUMN_SORT);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, listSortParams?.sortBy, listSortParams?.sortOrder]);

  const listQuery = useQuery({
    queryKey: [
      "inventory",
      "stock-balance",
      organizationId,
      currentPage,
      debouncedSearch,
      ...listSortQueryKeyPart(listSortParams),
    ],
    queryFn: () =>
      fetchStockBalanceListApi(
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
      key: "part",
      label: "PART",
      render: (row: StockBalanceListItem) => (
        <span className="font-medium text-gray-900">{row.partName}</span>
      ),
    },
    {
      key: "partNumber",
      label: "PART NO.",
      render: (row: StockBalanceListItem) => (
        <span className="text-sm text-gray-600">{row.partNumber}</span>
      ),
    },
    {
      key: "status",
      label: "STATUS",
      sortable: false,
      render: (row: StockBalanceListItem) => (
        <span className="text-sm text-gray-600">{row.stockStatus}</span>
      ),
    },
    {
      key: "onHand",
      label: "ON HAND",
      sortable: false,
      render: (row: StockBalanceListItem) => (
        <span className="text-sm text-gray-600">
          {row.locations.reduce((sum, loc) => sum + loc.quantity, 0)}
        </span>
      ),
    },
  ];

  return (
    <DashboardLayout
      title="Stock Balance"
      description="On-hand quantities by part and location."
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
        searchPlaceholder="Search parts"
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
        <p className="text-sm text-gray-500">Loading stock balance…</p>
      ) : listQuery.isError ? (
        <p className="text-sm text-red-600">Failed to load stock balance.</p>
      ) : items.length === 0 ? (
        <DashboardEmptyState
          icon={<PackageSearch className="h-7 w-7" strokeWidth={1.4} />}
          title="No stock balance data"
          description="Record stock receipts to see on-hand levels."
          buttonLabel="Clear search"
          onButtonClick={() => clearSearch()}
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
              status="active"
              locationId={row.id}
              viewHref={inventoryStockBalanceDetailHref(row.id)}
              hideOverflowMenu
              copyText={[
                `Part: ${row.partName}`,
                `Part Number: ${row.partNumber}`,
                `Status: ${row.stockStatus}`,
                `On hand: ${row.locations.reduce((sum, loc) => sum + loc.quantity, 0)}`,
              ].join("\n")}
            />
          )}
        />

      )}
    </DashboardLayout>
  );
}
