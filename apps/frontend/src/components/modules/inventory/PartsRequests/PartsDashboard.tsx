"use client";

import { useEffect, useState } from "react";
import { PackageSearch } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import DashboardLayout from "@/components/dashboard/DashboardLayout";
import DashboardFilters from "@/components/dashboard/DashboardFilters";
import DashboardTable from "@/components/dashboard/DashboardTable";
import DashboardEmptyState from "@/components/dashboard/DashboardEmptyState";
import DashboardTableActions from "@/components/dashboard/DashboardTableActions";
import { useAuth } from "@/providers/auth-provider";
import { dashboardListQueryOptions } from "@/lib/query/dashboard-list-query-options";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import {
  fetchPartsRequestsListApi,
  type PartsRequestListItem,
} from "@/lib/api/inventory/parts-requests";

const PAGE_SIZE = 10;

export default function PartsDashboard() {
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
      "parts-requests",
      organizationId,
      currentPage,
      debouncedSearch,
    ],
    queryFn: () =>
      fetchPartsRequestsListApi(
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
      render: (row: PartsRequestListItem) => (
        <span className="text-sm text-gray-600">{row.date}</span>
      ),
    },
    {
      key: "workOrder",
      label: "WORK ORDER",
      render: (row: PartsRequestListItem) => (
        <span className="text-sm font-medium text-gray-900">{row.workOrder}</span>
      ),
    },
    {
      key: "part",
      label: "PART",
      render: (row: PartsRequestListItem) => (
        <span className="text-sm text-gray-600">{row.part}</span>
      ),
    },
    {
      key: "status",
      label: "STATUS",
      render: (row: PartsRequestListItem) => (
        <span className="text-sm text-gray-600">{row.status}</span>
      ),
    },
  ];

  return (
    <DashboardLayout
      title="Parts Requests"
      description="Workshop reservations and fulfillment status."
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
        searchPlaceholder="Search requests"
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
        <p className="text-sm text-gray-500">Loading parts requests…</p>
      ) : listQuery.isError ? (
        <p className="text-sm text-red-600">Failed to load parts requests.</p>
      ) : items.length === 0 ? (
        <DashboardEmptyState
          icon={<PackageSearch className="h-7 w-7" strokeWidth={1.4} />}
          title="No parts requests"
          description="Requests from Workshop will appear here."
          buttonLabel="Clear search"
          onButtonClick={() => setSearch("")}
        />
      ) : (
        <DashboardTable
          columns={columns}
          data={items}
          getRowKey={(row) => row.id}
          renderActions={(row) => (
            <DashboardTableActions
              status="active"
              locationId={row.id}
              viewHref={`/inventory/parts-requests/${row.id}`}
            />
          )}
        />
      )}
    </DashboardLayout>
  );
}
