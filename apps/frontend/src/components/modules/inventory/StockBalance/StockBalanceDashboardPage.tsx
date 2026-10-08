"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PackageSearch } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import DashboardLayout from "@/components/dashboard/DashboardLayout";
import DashboardFilters from "@/components/dashboard/DashboardFilters";
import DashboardTable from "@/components/dashboard/DashboardTable";
import DashboardEmptyState from "@/components/dashboard/DashboardEmptyState";
import { useAuth } from "@/providers/auth-provider";
import { dashboardListQueryOptions } from "@/lib/query/dashboard-list-query-options";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import {
  fetchStockBalanceListApi,
  type StockBalanceListItem,
} from "@/lib/api/inventory/stock-balance";

const PAGE_SIZE = 10;

export default function StockBalanceDashboardPage() {
  const { token, organizationId, isLoading: isAuthLoading } = useAuth();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch]);

  const listQuery = useQuery({
    queryKey: [
      "inventory",
      "stock-balance",
      organizationId,
      currentPage,
      debouncedSearch,
    ],
    queryFn: () =>
      fetchStockBalanceListApi(
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
      key: "part",
      label: "PART",
      render: (row: StockBalanceListItem) => (
        <Link
          href={`/inventory/stock-balance/${row.id}`}
          className="font-medium text-[#FE5720]"
        >
          {row.partName}
        </Link>
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
      render: (row: StockBalanceListItem) => (
        <span className="text-sm text-gray-600">{row.stockStatus}</span>
      ),
    },
    {
      key: "onHand",
      label: "ON HAND",
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
        searchValue={search}
        searchPlaceholder="Search parts"
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
        <p className="text-sm text-gray-500">Loading stock balance…</p>
      ) : listQuery.isError ? (
        <p className="text-sm text-red-600">Failed to load stock balance.</p>
      ) : items.length === 0 ? (
        <DashboardEmptyState
          icon={<PackageSearch className="h-7 w-7" strokeWidth={1.4} />}
          title="No stock balance data"
          description="Record stock receipts to see on-hand levels."
          buttonLabel="Clear search"
          onButtonClick={() => setSearch("")}
        />
      ) : (
        <DashboardTable
          columns={columns}
          data={items}
          getRowKey={(row) => row.id}
        />
      )}
    </DashboardLayout>
  );
}
