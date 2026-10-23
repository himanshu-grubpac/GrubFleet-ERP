"use client";

import { useCallback, useEffect, useState } from "react";
import { PackageSearch } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import DashboardLayout from "@/components/dashboard/DashboardLayout";
import DashboardFilters from "@/components/dashboard/DashboardFilters";
import DashboardTable from "@/components/dashboard/DashboardTable";
import DashboardEmptyState from "@/components/dashboard/DashboardEmptyState";
import DashboardTableActions from "@/components/dashboard/DashboardTableActions";
import { useAuth } from "@/providers/auth-provider";
import { dashboardListQueryOptions } from "@/lib/query/dashboard-list-query-options";
import { INVENTORY_PARTS_REQUEST_COLUMN_SORT } from "@/lib/query/dashboard-list-column-sort-maps";
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
  fetchPartsRequestsListApi,
  type PartsRequestListItem,
} from "@/lib/api/inventory/parts-requests";
import { inventoryPartsRequestDetailHref } from "@/lib/navigation/inventory-static-routes";

const PAGE_SIZE = 10;

export default function PartsDashboard() {
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
  const [requestStatus, setRequestStatus] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const {
    sort: tableSort,
    onSortChange,
    listSortParams,
    serverSorted,
  } = useDashboardTableListSort(INVENTORY_PARTS_REQUEST_COLUMN_SORT);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, requestStatus, tableSort]);

  const listQuery = useQuery({
    queryKey: [
      "inventory",
      "parts-requests",
      organizationId,
      currentPage,
      debouncedSearch,
      requestStatus,
      ...listSortQueryKeyPart(listSortParams),
    ],
    queryFn: () =>
      fetchPartsRequestsListApi(
        {
          organizationId: organizationId!,
          page: currentPage,
          pageSize: PAGE_SIZE,
          search: debouncedSearch,
          ...(requestStatus ? { requestStatus } : {}),
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
      render: (row: PartsRequestListItem) => (
        <span className="text-sm text-gray-600">{row.date}</span>
      ),
    },
    {
      key: "workOrder",
      label: "WORK ORDER",
      sortable: false,
      render: (row: PartsRequestListItem) => (
        <span className="text-sm font-medium text-gray-900">{row.workOrder}</span>
      ),
    },
    {
      key: "part",
      label: "PART",
      sortable: false,
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
        searchValue={searchInput}
        searchPlaceholder="Search requests"
        onSearchChange={onListSearchChange}
        selectFilters={[
          {
            key: "requestStatus",
            label: "Status",
            options: [
              { value: "", label: "All statuses" },
              { value: "fulfilled", label: "Fulfilled" },
              { value: "blocked", label: "Blocked" },
              { value: "reserved", label: "Reserved" },
              { value: "cancelled", label: "Cancelled" },
              { value: "lapsed", label: "Lapsed" },
            ],
          },
        ]}
        filterValues={{ requestStatus }}
        onFilterChange={(key, value) => {
          if (key === "requestStatus") {
            setRequestStatus(value);
          }
        }}
        onClear={() => {
          clearSearch();
          setRequestStatus("");
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
              viewHref={inventoryPartsRequestDetailHref(row.id)}
              hideOverflowMenu
            />
          )}
        />
      )}
    </DashboardLayout>
  );
}
