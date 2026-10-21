
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Banknote } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import Button from "@/components/ui/GrubpacButton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import DashboardEmptyState from "@/components/dashboard/DashboardEmptyState";
import DashboardFilters from "@/components/dashboard/DashboardFilters";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import DashboardTable from "@/components/dashboard/DashboardTable";
import DashboardTableActions from "@/components/dashboard/DashboardTableActions";
import { DashboardRowActionsMenuItem } from "@/components/dashboard/DashboardRowActionsMenu";

import { useAuth } from "@/providers/auth-provider";

import {
  fetchVendorPaymentsApi,
  removeVendorPaymentApi,
  type VendorPaymentListItem,
} from "@/lib/api/finance/vendor-payments";

import { formatInrFromMinor } from "@/lib/format/money-format";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";

import {
  financeVendorPaymentDetailHref,
  financeVendorPaymentRecordHref,
} from "@/lib/navigation/finance-static-routes";

import { dashboardListQueryOptions } from "@/lib/query/dashboard-list-query-options";
import { FINANCE_VENDOR_PAYMENT_COLUMN_SORT } from "@/lib/query/dashboard-list-column-sort-maps";
import {
  listSortQueryKeyPart,
  useDashboardTableListSort,
} from "@/lib/query/dashboard-table-list-sort";

import {
  FINANCE_VENDOR_PAYMENT_REMOVE_ERROR,
  showApiErrorToast,
  showFinanceVendorPaymentRemovedToast,
} from "@/lib/toast/show-toast";

const PAGE_SIZE = 10;

export default function VendorPaymentsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const {
    token,
    organizationId,
    isLoading: authLoading,
    permissions,
    getApiError,
  } = useAuth();

  const canRecord =
    permissions.has("finance.create") ||
    permissions.has("finance.update") ||
    permissions.has("finance.manage");

  const canRemove =
    permissions.has("finance.delete") ||
    permissions.has("finance.manage");

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);

  const [page, setPage] = useState(1);

  const {
    sort: tableSort,
    onSortChange,
    listSortParams,
    serverSorted,
  } = useDashboardTableListSort(FINANCE_VENDOR_PAYMENT_COLUMN_SORT);

  const [removeTarget, setRemoveTarget] =
    useState<VendorPaymentListItem | null>(null);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, tableSort]);

  const listEnabled =
    Boolean(token) && Boolean(organizationId) && !authLoading;

  const listQuery = useQuery({
    queryKey: [
      "finance-vendor-payments",
      organizationId,
      page,
      debouncedSearch,
      ...listSortQueryKeyPart(listSortParams),
    ],
    queryFn: () =>
      fetchVendorPaymentsApi(token!, {
        organizationId: organizationId!,
        page,
        pageSize: PAGE_SIZE,
        search: debouncedSearch || undefined,
        ...listSortParams,
      }),
    enabled: listEnabled,
    ...dashboardListQueryOptions,
  });

  const removeMutation = useMutation({
    mutationFn: (row: VendorPaymentListItem) =>
      removeVendorPaymentApi(token!, organizationId!, row.id),

    onSuccess: (data) => {
      showFinanceVendorPaymentRemovedToast(data.paymentNumber);
      setRemoveTarget(null);

      void queryClient.invalidateQueries({
        queryKey: ["finance-vendor-payments"],
      });

      void queryClient.invalidateQueries({
        queryKey: ["finance-invoices"],
      });

      void queryClient.invalidateQueries({
        queryKey: ["finance-invoice-detail"],
      });
    },

    onError: (error) => {
      showApiErrorToast(error, FINANCE_VENDOR_PAYMENT_REMOVE_ERROR);
    },
  });

  const items = listQuery.data?.items ?? [];
  const total = listQuery.data?.total ?? 0;
  const totalPages = listQuery.data?.totalPages ?? 0;

  const isInitialLoading =
    authLoading || (listQuery.isLoading && !listQuery.data);

  const showGlobalEmpty =
    !isInitialLoading &&
    !listQuery.isError &&
    Boolean(listQuery.data) &&
    total === 0 &&
    !debouncedSearch;

  const infoBanner = (
    <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
      Remove is only available on the most recent payment per purchase
      invoice. This keeps payment history continuous when unwinding (LIFO).
    </div>
  );

  return (
    <DashboardLayout
      title="Vendor payments"
      description="Payments against purchase invoices move invoice status from Unpaid to Paid or Partially Paid."
      action={
        !authLoading && canRecord ? (
          <Button
            type="button"
            onClick={() => router.push(financeVendorPaymentRecordHref)}
          >
            + Record Payment
          </Button>
        ) : undefined
      }
      pagination={
        !showGlobalEmpty && totalPages > 1
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
      <>
        {/* Information banner - neutral gray styling */}
        {infoBanner}

        {/* Search */}
        <DashboardFilters
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Payment ID, invoice number, or vendor"
        />

        {/* Loading state */}
        {isInitialLoading ? (
          <div
            className="mt-4 flex min-h-[180px] items-center justify-center rounded-lg border border-gray-200 bg-white"
            aria-busy="true"
          >
            <p className="text-sm text-gray-500">
              Loading payments...
            </p>
          </div>
        ) : listQuery.isError ? (
          /* Error state */
          <div className="mt-4 flex min-h-[180px] flex-col items-center justify-center rounded-lg border border-red-100 bg-white p-6 text-center">
            <p className="text-sm font-medium text-red-600">
              Could not load vendor payments.
              {listQuery.error
                ? ` ${getApiError?.(listQuery.error) ?? "Request failed."}`
                : ""}
            </p>

            <button
              type="button"
              className="mt-2 text-sm text-gray-600 underline"
              onClick={() => void listQuery.refetch()}
            >
              Try again
            </button>
          </div>
        ) : showGlobalEmpty ? (
          /* Empty catalog state */
          <div className="mt-4">
            <DashboardEmptyState
              icon={
                <Banknote
                  className="h-7 w-7"
                  strokeWidth={1.4}
                />
              }
              title="No vendor payments recorded yet"
              description="Record a payment against an open purchase invoice to update paid totals."
            />

            {canRecord && (
              <div className="mt-4 flex justify-center">
                <Button
                  type="button"
                  onClick={() =>
                    router.push(financeVendorPaymentRecordHref)
                  }
                >
                  + Record Payment
                </Button>
              </div>
            )}
          </div>
        ) : items.length === 0 ? (
          /* No search results */
          <div className="mt-4">
            <DashboardEmptyState
              icon={
                <Banknote
                  className="h-7 w-7"
                  strokeWidth={1.4}
                />
              }
              title="No payments found"
              description="Try changing your search to find vendor payments."
              buttonLabel="Clear search"
              onButtonClick={() => {
                setSearch("");
                setPage(1);
              }}
            />
          </div>
        ) : (
          /* Payments table */
          <div
            className="mt-4"
            aria-busy={listQuery.isFetching}
          >
            <DashboardTable<VendorPaymentListItem>
              data={items}
              getRowKey={(row) => row.id}
              sortState={tableSort}
              onSortChange={onSortChange}
              serverSorted={serverSorted}
              columns={[
                {
                  key: "paymentNumber",
                  label: "Payment ID",
                  render: (row) => row.paymentNumber,
                },
                {
                  key: "paymentDate",
                  label: "Date",
                  render: (row) => row.paymentDate,
                },
                {
                  key: "invoice",
                  label: "Purchase invoice",
                  sortable: false,
                  render: (row) => row.purchaseInvoiceNumber,
                },
                {
                  key: "vendor",
                  label: "Vendor",
                  sortable: false,
                  render: (row) => row.vendorName,
                },
                {
                  key: "amount",
                  label: "Amount",
                  sortable: false,
                  render: (row) =>
                    formatInrFromMinor(row.amountMinor),
                },
                {
                  key: "method",
                  label: "Method",
                  sortable: false,
                  render: (row) =>
                    row.paymentMethodLabel ??
                    row.paymentMethod ??
                    "—",
                },
                {
                  key: "reference",
                  label: "Reference",
                  sortable: false,
                  render: (row) => row.paymentReference ?? "—",
                },
              ]}
              renderActions={(row) => {
                const copyText = [
                  row.paymentNumber,
                  row.paymentDate,
                  row.purchaseInvoiceNumber,
                  row.vendorName,
                  formatInrFromMinor(row.amountMinor),
                  row.paymentMethodLabel ?? row.paymentMethod ?? "",
                  row.paymentReference ?? "",
                ].join("\t");

                return (
                  <DashboardTableActions
                    status="active"
                    viewHref={financeVendorPaymentDetailHref(row.id)}
                    copyText={copyText}
                    alwaysShowOverflowMenu
                    renderAdditionalMenuItems={
                      canRemove && row.availableActions.remove
                        ? () => (
                          <DashboardRowActionsMenuItem
                            label="Remove"
                            onSelect={() => setRemoveTarget(row)}
                          />
                        )
                        : undefined
                    }
                  />
                );
              }}
            />
          </div>
        )}

        {/* Remove payment confirmation */}
        <ConfirmDialog
          open={removeTarget !== null}
          title="Remove vendor payment?"
          message={
            removeTarget
              ? `${formatInrFromMinor(
                removeTarget.amountMinor,
              )} via ${removeTarget.paymentMethodLabel ??
              removeTarget.paymentMethod ??
              "payment"
              } on ${removeTarget.paymentDate} for invoice ${removeTarget.purchaseInvoiceNumber
              } (${removeTarget.vendorName}). The invoice paid-to-date will decrease by this amount.`
              : ""
          }
          confirmLabel="Remove"
          cancelLabel="Keep payment"
          variant="destructive"
          isConfirmPending={removeMutation.isPending}
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
        />
      </>
    </DashboardLayout>
  );
}