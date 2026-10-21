"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText } from "lucide-react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import DashboardFilters from "@/components/dashboard/DashboardFilters";
import Button from "@/components/ui/GrubpacButton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import DashboardTable, {
  type DashboardColumn,
} from "@/components/dashboard/DashboardTable";
import DashboardTableActions from "@/components/dashboard/DashboardTableActions";
import DashboardEmptyState from "@/components/dashboard/DashboardEmptyState";
import { DashboardRowActionsMenuItem } from "@/components/dashboard/DashboardRowActionsMenu";
import { DASHBOARD_DEFAULT_PAGE_SIZE } from "@/components/dashboard/dashboard-pagination";

import { useAuth } from "@/providers/auth-provider";
import { dashboardListQueryOptions } from "@/lib/query/dashboard-list-query-options";
import { useDashboardListSearch } from "@/lib/hooks/use-dashboard-list-search";
import {
  isDashboardCatalogEmptyState,
  shouldShowDashboardListFilters,
} from "@/lib/hooks/dashboard-list-search-ui";

import { formatInrFromMinor } from "@/lib/format/money-format";

import {
  cancelFinanceInvoiceApi,
  fetchFinanceInvoicesApi,
  removeFinancePurchaseInvoiceApi,
  type FinanceInvoiceListItem,
  type FinanceInvoiceStatus,
  type FinanceInvoiceType,
} from "@/lib/api/finance/invoices";

import {
  STATUS_OPTIONS,
  TYPE_TABS,
  type InvoiceTypeTab,
} from "@/lib/finance/invoice-filter-options";

import {
  financeInvoiceDetailHref,
  financeInvoiceNewTypeHref,
} from "@/lib/navigation/finance-static-routes";

import {
  FINANCE_INVOICE_CANCEL_ERROR,
  FINANCE_INVOICE_REMOVE_ERROR,
  showApiErrorToast,
  showFinanceInvoiceCancelledToast,
  showFinanceInvoiceRemovedToast,
} from "@/lib/toast/show-toast";

function statusBadgeClass(status: FinanceInvoiceStatus): string {
  switch (status) {
    case "paid":
      return "bg-emerald-50 text-emerald-700";
    case "partially_paid":
      return "bg-amber-50 text-amber-700";
    case "unpaid":
      return "bg-red-50 text-red-700";
    default:
      return "bg-slate-100 text-slate-600";
  }
}

function statusLabel(status: FinanceInvoiceStatus): string {
  switch (status) {
    case "partially_paid":
      return "Partially Paid";
    case "unpaid":
      return "Unpaid";
    case "paid":
      return "Paid";
    default:
      return status;
  }
}

function typeLabel(type: FinanceInvoiceType): string {
  return type.charAt(0).toUpperCase() + type.slice(1);
}

export default function DashboardInvoicesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const {
    token,
    organizationId,
    isLoading: isAuthLoading,
    permissions,
  } = useAuth();

  const canCreate =
    permissions.has("finance.create") ||
    permissions.has("finance.manage");

  const canDelete =
    permissions.has("finance.delete") ||
    permissions.has("finance.manage");

  const {
    searchInput,
    setSearchInput,
    debouncedSearch,
  } = useDashboardListSearch();

  const [statusFilter, setStatusFilter] = useState("");
  const [typeTab, setTypeTab] = useState<InvoiceTypeTab>("all");
  const [page, setPage] = useState(1);

  const [cancelTarget, setCancelTarget] =
    useState<FinanceInvoiceListItem | null>(null);

  const [removeTarget, setRemoveTarget] =
    useState<FinanceInvoiceListItem | null>(null);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter, typeTab]);

  const listEnabled =
    Boolean(token) &&
    Boolean(organizationId) &&
    !isAuthLoading;

  const listQuery = useQuery({
    queryKey: [
      "finance-invoices",
      organizationId,
      debouncedSearch,
      statusFilter,
      typeTab,
      page,
    ],
    queryFn: () =>
      fetchFinanceInvoicesApi(token!, {
        organizationId: organizationId!,
        page,
        pageSize: DASHBOARD_DEFAULT_PAGE_SIZE,
        search: debouncedSearch.trim() || undefined,
        status: statusFilter
          ? (statusFilter as FinanceInvoiceStatus)
          : undefined,
        invoiceType: typeTab === "all" ? undefined : typeTab,
      }),
    enabled: listEnabled,
    ...dashboardListQueryOptions,
  });

  const items = listQuery.data?.items ?? [];
  const total = listQuery.data?.total ?? 0;
  const listPage = listQuery.data?.page ?? page;

  const totalPages = Math.max(
    1,
    Math.ceil(total / DASHBOARD_DEFAULT_PAGE_SIZE),
  );

  const isInitialLoading =
    isAuthLoading || (listQuery.isLoading && !listQuery.data);

  const hasActiveFilters =
    statusFilter !== "" || typeTab !== "all";

  const showFilters = shouldShowDashboardListFilters({
    total,
    searchInput,
    debouncedSearch,
    hasActiveSelectFilters: hasActiveFilters,
    isFetchingWithPlaceholder:
      listQuery.isFetching && listQuery.isPlaceholderData,
  });

  const isEmptyCatalog = isDashboardCatalogEmptyState({
    total,
    searchInput,
    debouncedSearch,
    hasActiveFilters,
    isFetching: listQuery.isFetching,
  });

  const handleClearFilters = () => {
    setSearchInput("");
    setStatusFilter("");
    setTypeTab("all");
    setPage(1);
  };

  const invalidateInvoiceQueries = () => {
    void queryClient.invalidateQueries({
      queryKey: ["finance-invoices"],
    });
  };

  const cancelMutation = useMutation({
    mutationFn: (invoice: FinanceInvoiceListItem) =>
      cancelFinanceInvoiceApi(
        token!,
        organizationId!,
        invoice.id,
      ),
    onSuccess: (data) => {
      showFinanceInvoiceCancelledToast(data.invoiceNumber);
      setCancelTarget(null);
      invalidateInvoiceQueries();
    },
    onError: (error) => {
      showApiErrorToast(error, FINANCE_INVOICE_CANCEL_ERROR);
    },
  });

  const removeMutation = useMutation({
    mutationFn: (invoice: FinanceInvoiceListItem) =>
      removeFinancePurchaseInvoiceApi(
        token!,
        organizationId!,
        invoice.id,
      ),
    onSuccess: (data) => {
      showFinanceInvoiceRemovedToast(data.invoiceNumber);
      setRemoveTarget(null);
      invalidateInvoiceQueries();
    },
    onError: (error) => {
      showApiErrorToast(error, FINANCE_INVOICE_REMOVE_ERROR);
    },
  });

  const columns: DashboardColumn<FinanceInvoiceListItem>[] = [
    {
      key: "invoiceNumber",
      label: "Invoice No.",
      render: (row) => row.invoiceNumber,
    },
    {
      key: "type",
      label: "Type",
      render: (row) => typeLabel(row.invoiceType),
    },
    {
      key: "date",
      label: "Date",
      render: (row) => row.invoiceDate,
    },
    {
      key: "party",
      label: "Party",
      render: (row) => row.partyName,
    },
    {
      key: "description",
      label: "Description",
      render: (row) => row.description,
    },
    {
      key: "amount",
      label: "Amount",
      render: (row) =>
        formatInrFromMinor(row.totalAmountMinor),
    },
    {
      key: "status",
      label: "Status",
      render: (row) => (
        <span
          className={`inline-flex rounded-md px-2.5 py-1 text-xs font-semibold ${statusBadgeClass(row.status)}`}
        >
          {statusLabel(row.status)}
        </span>
      ),
    },
  ];

  const renderRowActions = (row: FinanceInvoiceListItem) => {
    const copyText = [
      row.invoiceNumber,
      typeLabel(row.invoiceType),
      row.invoiceDate,
      row.partyName,
      formatInrFromMinor(row.totalAmountMinor),
      statusLabel(row.status),
    ].join("\t");

    const rowActions = row.availableActions;

    const canCancel =
      canDelete &&
      (
        rowActions?.cancel === true ||
        (
          row.invoiceType !== "purchase" &&
          row.status !== "paid" &&
          row.status !== "cancelled"
        )
      );

    const canRemove =
      canDelete &&
      row.invoiceType === "purchase" &&
      rowActions?.remove === true;

    return (
      <DashboardTableActions
        status="active"
        viewHref={financeInvoiceDetailHref(row.id)}
        copyText={copyText}
        alwaysShowOverflowMenu
        renderAdditionalMenuItems={() => (
          <>
            {canCancel && (
              <DashboardRowActionsMenuItem
                label="Cancel invoice"
                onSelect={() => setCancelTarget(row)}
              />
            )}

            {canRemove && (
              <DashboardRowActionsMenuItem
                label="Remove"
                onSelect={() => setRemoveTarget(row)}
              />
            )}
          </>
        )}
      />
    );
  };

  return (
    <>
      <DashboardLayout
        title="Invoices"
        description="Track purchase, sale, and billing invoices."
        action={
          !isAuthLoading && canCreate ? (
            <Button
              type="button"
              onClick={() =>
                router.push(financeInvoiceNewTypeHref)
              }
            >
              Add Invoice
            </Button>
          ) : undefined
        }
        pagination={{
          currentPage: listPage,
          totalPages,
          totalItems: total,
          pageSize: DASHBOARD_DEFAULT_PAGE_SIZE,
          onPageChange: setPage,
        }}
      >
        <>
          <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
            Purchase invoices record vendor bills for vehicles
            and spare parts. Vendor payments and sale/billing
            invoicing are separate flows.
          </div>


          {isInitialLoading && (
            <div
              className="flex min-h-[180px] items-center justify-center rounded-lg border border-gray-200 bg-white"
              aria-busy="true"
              aria-label="Loading invoices"
            >
              <p className="text-sm text-gray-500">
                Loading invoices…
              </p>
            </div>
          )}
          <DashboardFilters
            searchValue={searchInput}
            searchPlaceholder="Invoice number or party name"
            onSearchChange={setSearchInput}
            filterValues={{
              status: statusFilter,
              invoiceType: typeTab === "all" ? "" : typeTab,
            }}
            selectFilters={[
              {
                key: "status",
                label: "Statuses",
                options: STATUS_OPTIONS,
              },
            ]}
            onFilterChange={(key, value) => {
              if (key === "status") {
                setStatusFilter(value);
              }
            }}
            childrenPosition="before-selects"
          >
            <div className="flex shrink-0 flex-wrap items-center gap-1.5">
              {TYPE_TABS.map((tab) => {
                const isActive = typeTab === tab.value;

                return (
                  <Button
                    key={tab.value}
                    type="button"
                    variant={isActive ? "secondary" : "outline"}
                    onClick={() => setTypeTab(tab.value)}
                    aria-pressed={isActive}
                    className="h-8 rounded-md px-4 text-sm font-medium"
                  >
                    {tab.label}
                  </Button>
                );
              })}
            </div>
          </DashboardFilters>


          {listQuery.isError && !isInitialLoading && (
            <div className="flex min-h-[180px] flex-col items-center justify-center rounded-lg border border-red-100 bg-white">
              <p className="text-sm font-medium text-red-600">
                Failed to load invoices.
              </p>
              <button
                type="button"
                onClick={() => void listQuery.refetch()}
                className="mt-2 text-sm text-gray-600 underline"
              >
                Try again
              </button>
            </div>
          )}

          {!isInitialLoading && !listQuery.isError && (
            <>
              {isEmptyCatalog ? (
                <DashboardEmptyState
                  icon={
                    <FileText
                      className="h-7 w-7"
                      strokeWidth={1.4}
                    />
                  }
                  title="No invoices yet"
                  description="Create your first invoice to record vendor bills and manage billing."
                  buttonLabel={
                    canCreate ? "Add Invoice" : undefined
                  }
                  onButtonClick={
                    canCreate
                      ? () =>
                        router.push(financeInvoiceNewTypeHref)
                      : undefined
                  }
                />
              ) : items.length === 0 ? (
                <DashboardEmptyState
                  icon={
                    <FileText
                      className="h-7 w-7"
                      strokeWidth={1.4}
                    />
                  }
                  title="No invoices found"
                  description="Try changing your search, invoice type, or status filter."
                  buttonLabel="Clear filters"
                  onButtonClick={handleClearFilters}
                />
              ) : (
                <div
                  className={showFilters ? "mt-4" : undefined}
                  aria-busy={
                    listQuery.isFetching &&
                    listQuery.isPlaceholderData
                  }
                >
                  <DashboardTable
                    columns={columns}
                    data={items}
                    getRowKey={(row) => row.id}
                    renderActions={renderRowActions}
                  />
                </div>
              )}
            </>
          )}
        </>
      </DashboardLayout>

      <ConfirmDialog
        open={cancelTarget !== null}
        title="Cancel invoice?"
        message={
          cancelTarget
            ? cancelTarget.amountPaidMinor > 0
              ? `${cancelTarget.invoiceNumber} has ${formatInrFromMinor(
                cancelTarget.amountPaidMinor,
              )} recorded in payments. It will be marked cancelled.`
              : `${cancelTarget.invoiceNumber} will be marked cancelled and hidden from the default list.`
            : ""
        }
        confirmLabel="Cancel invoice"
        cancelLabel="Keep invoice"
        variant="destructive"
        onConfirm={() => {
          if (cancelTarget) {
            cancelMutation.mutate(cancelTarget);
          }
        }}
        onClose={() => {
          if (!cancelMutation.isPending) {
            setCancelTarget(null);
          }
        }}
        isConfirmPending={cancelMutation.isPending}
      />

      <ConfirmDialog
        open={removeTarget !== null}
        title="Remove purchase invoice?"
        message={
          removeTarget
            ? `${removeTarget.invoiceNumber} will be permanently removed from the register.`
            : ""
        }
        confirmLabel="Remove invoice"
        cancelLabel="Keep invoice"
        variant="destructive"
        onConfirm={() => {
          if (removeTarget) {
            removeMutation.mutate(removeTarget);
          }
        }}
        onClose={() => {
          if (!removeMutation.isPending) {
            setRemoveTarget(null);
          }
        }}
        isConfirmPending={removeMutation.isPending}
      />
    </>
  );
}
