"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText } from "lucide-react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import Button from "@/components/ui/GrubpacButton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import DashboardTable from "@/components/dashboard/DashboardTable";
import DashboardTableActions from "@/components/dashboard/DashboardTableActions";
import DashboardFilters from "@/components/dashboard/DashboardFilters";
import DashboardEmptyState from "@/components/dashboard/DashboardEmptyState";
import { DashboardRowActionsMenuItem } from "@/components/dashboard/DashboardRowActionsMenu";
import { useAuth } from "@/providers/auth-provider";
import { dashboardListQueryOptions } from "@/lib/query/dashboard-list-query-options";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
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
  showErrorToast,
  showFinanceInvoiceCancelledToast,
  showFinanceInvoiceRemovedToast,
} from "@/lib/toast/show-toast";

const PAGE_SIZE = 10;

function statusBadgeClass(status: FinanceInvoiceStatus): string {
  switch (status) {
    case "paid":
      return "bg-emerald-100 text-emerald-700";
    case "partially_paid":
      return "bg-amber-100 text-amber-800";
    case "unpaid":
      return "bg-red-100 text-red-700";
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
  const { token, organizationId, isLoading: authLoading, permissions } =
    useAuth();

  const canCreate =
    permissions.has("finance.create") || permissions.has("finance.manage");
  const canDelete =
    permissions.has("finance.delete") || permissions.has("finance.manage");

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
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
    !!token && !!organizationId && !authLoading;

  const listQuery = useQuery({
    queryKey: [
      "finance-invoices",
      organizationId,
      page,
      debouncedSearch,
      statusFilter,
      typeTab,
    ],
    queryFn: () =>
      fetchFinanceInvoicesApi(token!, {
        organizationId: organizationId!,
        page,
        pageSize: PAGE_SIZE,
        search: debouncedSearch || undefined,
        status: (statusFilter || undefined) as FinanceInvoiceStatus | undefined,
        invoiceType: typeTab === "all" ? undefined : typeTab,
      }),
    enabled: listEnabled,
    ...dashboardListQueryOptions,
  });

  const cancelMutation = useMutation({
    mutationFn: (row: FinanceInvoiceListItem) =>
      cancelFinanceInvoiceApi(token!, organizationId!, row.id),
    onSuccess: (data) => {
      showFinanceInvoiceCancelledToast(data.invoiceNumber);
      setCancelTarget(null);
      void queryClient.invalidateQueries({ queryKey: ["finance-invoices"] });
    },
    onError: () => {
      showErrorToast(FINANCE_INVOICE_CANCEL_ERROR);
    },
  });

  const removeMutation = useMutation({
    mutationFn: (row: FinanceInvoiceListItem) =>
      removeFinancePurchaseInvoiceApi(token!, organizationId!, row.id),
    onSuccess: (data) => {
      showFinanceInvoiceRemovedToast(data.invoiceNumber);
      setRemoveTarget(null);
      void queryClient.invalidateQueries({ queryKey: ["finance-invoices"] });
    },
    onError: () => {
      showErrorToast(FINANCE_INVOICE_REMOVE_ERROR);
    },
  });

  const items = listQuery.data?.items ?? [];
  const total = listQuery.data?.total ?? 0;
  const totalPages = listQuery.data?.totalPages ?? 0;

  const showGlobalEmpty =
    !listQuery.isLoading &&
    !listQuery.isError &&
    total === 0 &&
    !debouncedSearch &&
    !statusFilter &&
    typeTab === "all";

  const infoBanner = useMemo(
    () => (
      <div className="mb-4 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">
        Purchase invoices record vendor bills for vehicles and spare parts.
        Vendor payments and sale/billing invoicing are separate flows — use
        Vendor Payments or Sale/Billing when those modules are available.
      </div>
    ),
    [],
  );

  const addButton = canCreate ? (
    <Button
      type="button"
      onClick={() => router.push(financeInvoiceNewTypeHref)}
    >
      Add Invoice
    </Button>
  ) : null;

  return (
    <>
      <DashboardLayout
        title="Invoices"
        description="Track purchase, sale, and billing invoices."
        action={addButton}
        pagination={
          totalPages > 1
            ? {
                currentPage: page,
                totalPages,
                totalItems: total,
                pageSize: PAGE_SIZE,
                onPageChange: setPage,
              }
            : undefined
        }
      >
        <div className="px-6 pb-6">
          {infoBanner}

          <div className="mb-4 flex flex-wrap gap-2">
            {TYPE_TABS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => setTypeTab(tab.value)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                  typeTab === tab.value
                    ? "bg-[#FE5720] text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <DashboardFilters
            searchValue={search}
            searchPlaceholder="Invoice number or party name"
            onSearchChange={setSearch}
            selectFilters={[
              {
                key: "status",
                label: "Status",
                options: STATUS_OPTIONS,
              },
            ]}
            filterValues={{ status: statusFilter }}
            onFilterChange={(key, value) => {
              if (key === "status") setStatusFilter(value);
            }}
            onClear={() => {
              setSearch("");
              setStatusFilter("");
            }}
          />

          {listQuery.isLoading ? (
            <div className="mt-6 rounded-lg border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
              Loading invoices…
            </div>
          ) : listQuery.isError ? (
            <div className="mt-6 rounded-lg border border-red-100 bg-red-50 p-6 text-sm text-red-800">
              Could not load invoices.{" "}
              <button
                type="button"
                className="font-medium underline"
                onClick={() => void listQuery.refetch()}
              >
                Retry
              </button>
            </div>
          ) : showGlobalEmpty ? (
            <div className="mt-6">
              <DashboardEmptyState
                icon={
                  <FileText className="h-7 w-7" strokeWidth={1.4} />
                }
                title="No invoices yet"
                description="Create a purchase invoice to record vendor bills for vehicles or spare parts."
              />
              {canCreate ? (
                <div className="mt-4 flex justify-center">
                  <Button
                    type="button"
                    onClick={() => router.push(financeInvoiceNewTypeHref)}
                  >
                    Add Invoice
                  </Button>
                </div>
              ) : null}
            </div>
          ) : items.length === 0 ? (
            <div className="mt-6 flex min-h-[180px] flex-col items-center justify-center rounded-lg border border-gray-200 bg-white text-center text-sm text-gray-500">
              No invoices match your filters.
            </div>
          ) : (
            <div className="mt-4">
              <DashboardTable<FinanceInvoiceListItem>
                data={items}
                getRowKey={(row) => row.id}
                columns={[
                  {
                    key: "invoiceNumber",
                    label: "Invoice No",
                    render: (item) => item.invoiceNumber,
                  },
                  {
                    key: "type",
                    label: "Type",
                    render: (item) => typeLabel(item.invoiceType),
                  },
                  {
                    key: "date",
                    label: "Date",
                    render: (item) => item.invoiceDate,
                  },
                  {
                    key: "party",
                    label: "Party",
                    render: (item) => item.partyName,
                  },
                  {
                    key: "description",
                    label: "Description",
                    render: (item) => item.description,
                  },
                  {
                    key: "amount",
                    label: "Amount",
                    render: (item) =>
                      formatInrFromMinor(item.totalAmountMinor),
                  },
                  {
                    key: "status",
                    label: "Status",
                    render: (item) => (
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadgeClass(item.status)}`}
                      >
                        {statusLabel(item.status)}
                      </span>
                    ),
                  },
                ]}
                renderActions={(row) => {
                  const item = row;
                  const copyText = [
                    item.invoiceNumber,
                    typeLabel(item.invoiceType),
                    item.invoiceDate,
                    item.partyName,
                    formatInrFromMinor(item.totalAmountMinor),
                    statusLabel(item.status),
                  ].join("\t");

                  return (
                    <DashboardTableActions
                      status="active"
                      viewHref={financeInvoiceDetailHref(item.id)}
                      copyText={copyText}
                      renderAdditionalMenuItems={
                        canDelete
                          ? () => {
                              const rowActions = item.availableActions;
                              if (rowActions?.remove) {
                                return (
                                  <DashboardRowActionsMenuItem
                                    label="Remove"
                                    onSelect={() => setRemoveTarget(item)}
                                  />
                                );
                              }
                              if (
                                rowActions?.cancel ||
                                (item.invoiceType !== "purchase" &&
                                  item.status !== "paid" &&
                                  item.status !== "cancelled")
                              ) {
                                return (
                                  <DashboardRowActionsMenuItem
                                    label="Cancel invoice"
                                    onSelect={() => setCancelTarget(item)}
                                  />
                                );
                              }
                              return null;
                            }
                          : undefined
                      }
                    />
                  );
                }}
              />
            </div>
          )}
        </div>
      </DashboardLayout>

      <ConfirmDialog
        open={!!cancelTarget}
        title="Cancel invoice?"
        message={
          cancelTarget
            ? cancelTarget.amountPaidMinor > 0
              ? `${cancelTarget.invoiceNumber} has ${formatInrFromMinor(cancelTarget.amountPaidMinor)} recorded in payments. It will be marked cancelled.`
              : `${cancelTarget.invoiceNumber} will be marked cancelled and hidden from the default list.`
            : ""
        }
        confirmLabel="Cancel invoice"
        cancelLabel="Keep invoice"
        variant="destructive"
        onConfirm={() => {
          if (cancelTarget) cancelMutation.mutate(cancelTarget);
        }}
        onClose={() => setCancelTarget(null)}
        isConfirmPending={cancelMutation.isPending}
      />

      <ConfirmDialog
        open={!!removeTarget}
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
          if (removeTarget) removeMutation.mutate(removeTarget);
        }}
        onClose={() => setRemoveTarget(null)}
        isConfirmPending={removeMutation.isPending}
      />
    </>
  );
}
