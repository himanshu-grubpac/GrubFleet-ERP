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
import {
  FINANCE_VENDOR_PAYMENT_REMOVE_ERROR,
  showErrorToast,
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
    permissions.has("finance.delete") || permissions.has("finance.manage");

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [page, setPage] = useState(1);
  const [removeTarget, setRemoveTarget] =
    useState<VendorPaymentListItem | null>(null);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const listEnabled = !!token && !!organizationId && !authLoading;

  const listQuery = useQuery({
    queryKey: [
      "finance-vendor-payments",
      organizationId,
      page,
      debouncedSearch,
    ],
    queryFn: () =>
      fetchVendorPaymentsApi(token!, {
        organizationId: organizationId!,
        page,
        pageSize: PAGE_SIZE,
        search: debouncedSearch || undefined,
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
      void queryClient.invalidateQueries({ queryKey: ["finance-invoices"] });
      void queryClient.invalidateQueries({
        queryKey: ["finance-invoice-detail"],
      });
    },
    onError: () => {
      showErrorToast(FINANCE_VENDOR_PAYMENT_REMOVE_ERROR);
    },
  });

  const items = listQuery.data?.items ?? [];
  const total = listQuery.data?.total ?? 0;
  const totalPages = listQuery.data?.totalPages ?? 0;
  const showGlobalEmpty =
    !listQuery.isLoading &&
    !listQuery.isError &&
    listQuery.data &&
    total === 0 &&
    !debouncedSearch;

  const infoBanner = (
    <div className="mb-4 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">
      Remove is only available on the most recent payment per purchase invoice.
      This keeps payment history continuous when unwinding (LIFO).
    </div>
  );

  return (
    <DashboardLayout
      title="Vendor payments"
      description="Payments against purchase invoices move invoice status from Unpaid to Paid or Partially Paid."
      action={
        canRecord ? (
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
      <div className="px-6 pb-6">
      {infoBanner}

      <DashboardFilters
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Payment ID, invoice number, or vendor"
      />

      {listQuery.isLoading ? (
        <div className="mt-6 text-sm text-slate-500">Loading payments…</div>
      ) : listQuery.isError ? (
        <div className="mt-6 rounded-lg border border-red-100 bg-red-50 p-6 text-sm text-red-800">
          <p>
            Could not load vendor payments.
            {listQuery.error
              ? ` ${getApiError?.(listQuery.error) ?? "Request failed."}`
              : null}
          </p>
          <button
            type="button"
            className="mt-2 font-medium underline"
            onClick={() => void listQuery.refetch()}
          >
            Retry
          </button>
        </div>
      ) : showGlobalEmpty ? (
        <div className="mt-6">
          <DashboardEmptyState
            icon={<Banknote className="h-7 w-7" strokeWidth={1.4} />}
            title="No vendor payments recorded yet"
            description="Record a payment against an open purchase invoice to update paid totals."
          />
          {canRecord ? (
            <div className="mt-4 flex justify-center">
              <Button
                type="button"
                onClick={() => router.push(financeVendorPaymentRecordHref)}
              >
                + Record Payment
              </Button>
            </div>
          ) : null}
        </div>
      ) : items.length === 0 ? (
        <div className="mt-6 flex min-h-[180px] flex-col items-center justify-center rounded-lg border border-gray-200 bg-white text-center text-sm text-gray-500">
          No payments match your search.
        </div>
      ) : (
        <div className="mt-4">
          <DashboardTable<VendorPaymentListItem>
            data={items}
            getRowKey={(row) => row.id}
            columns={[
              {
                key: "paymentNumber",
                label: "Payment ID",
                render: (item) => item.paymentNumber,
              },
              {
                key: "paymentDate",
                label: "Date",
                render: (item) => item.paymentDate,
              },
              {
                key: "invoice",
                label: "Purchase invoice",
                render: (item) => item.purchaseInvoiceNumber,
              },
              {
                key: "vendor",
                label: "Vendor",
                render: (item) => item.vendorName,
              },
              {
                key: "amount",
                label: "Amount",
                render: (item) => formatInrFromMinor(item.amountMinor),
              },
              {
                key: "method",
                label: "Method",
                render: (item) =>
                  item.paymentMethodLabel ?? item.paymentMethod ?? "—",
              },
              {
                key: "reference",
                label: "Reference",
                render: (item) => item.paymentReference ?? "—",
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

      <ConfirmDialog
        open={!!removeTarget}
        title="Remove vendor payment?"
        message={
          removeTarget
            ? `${formatInrFromMinor(removeTarget.amountMinor)} via ${removeTarget.paymentMethodLabel ?? removeTarget.paymentMethod ?? "payment"} on ${removeTarget.paymentDate} for invoice ${removeTarget.purchaseInvoiceNumber} (${removeTarget.vendorName}). The invoice paid-to-date will decrease by this amount.`
            : ""
        }
        confirmLabel="Remove"
        cancelLabel="Keep payment"
        variant="destructive"
        isConfirmPending={removeMutation.isPending}
        onConfirm={() => {
          if (removeTarget) removeMutation.mutate(removeTarget);
        }}
        onClose={() => setRemoveTarget(null)}
      />
      </div>
    </DashboardLayout>
  );
}
