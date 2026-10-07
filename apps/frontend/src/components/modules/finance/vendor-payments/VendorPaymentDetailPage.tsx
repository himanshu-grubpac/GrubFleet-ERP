"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import DetailField from "@/components/common/DetailField";
import OrganizationDetailCard, {
  OrganizationDetailFieldGrid,
} from "@/components/common/OrganizationDetailCard";
import OrganizationViewLayout from "@/components/common/OrganizationViewLayout";
import Button from "@/components/ui/GrubpacButton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { SubPageBackLink } from "@/components/ui/SubPageBackLink";
import { useAuth } from "@/providers/auth-provider";
import {
  fetchVendorPaymentDetailApi,
  removeVendorPaymentApi,
} from "@/lib/api/finance/vendor-payments";
import { formatInrFromMinor } from "@/lib/format/money-format";
import {
  financeInvoiceDetailHref,
  financeVendorPaymentsListHref,
} from "@/lib/navigation/finance-static-routes";
import { useFinanceEntityId } from "@/lib/navigation/use-finance-entity-id";
import {
  FINANCE_VENDOR_PAYMENT_REMOVE_ERROR,
  showErrorToast,
  showFinanceVendorPaymentRemovedToast,
} from "@/lib/toast/show-toast";

export default function VendorPaymentDetailPage() {
  const paymentId = useFinanceEntityId("paymentId");
  const router = useRouter();
  const queryClient = useQueryClient();
  const { token, organizationId, isLoading: authLoading, permissions } =
    useAuth();

  const canRemove =
    permissions.has("finance.delete") || permissions.has("finance.manage");

  const [removeOpen, setRemoveOpen] = useState(false);

  const detailQuery = useQuery({
    queryKey: ["finance-vendor-payment-detail", organizationId, paymentId],
    queryFn: () =>
      fetchVendorPaymentDetailApi(token!, organizationId!, paymentId!),
    enabled: !!token && !!organizationId && !!paymentId && !authLoading,
  });

  const removeMutation = useMutation({
    mutationFn: () =>
      removeVendorPaymentApi(token!, organizationId!, paymentId!),
    onSuccess: (data) => {
      showFinanceVendorPaymentRemovedToast(data.paymentNumber);
      void queryClient.invalidateQueries({
        queryKey: ["finance-vendor-payments"],
      });
      void queryClient.invalidateQueries({ queryKey: ["finance-invoices"] });
      router.push(financeVendorPaymentsListHref);
    },
    onError: () => {
      showErrorToast(FINANCE_VENDOR_PAYMENT_REMOVE_ERROR);
    },
  });

  if (!paymentId) {
    return (
      <OrganizationViewLayout>
        <SubPageBackLink
          href={financeVendorPaymentsListHref}
          label="Vendor payments"
        />
        <p className="text-sm text-slate-600">Missing payment id.</p>
      </OrganizationViewLayout>
    );
  }

  if (detailQuery.isLoading || authLoading) {
    return (
      <OrganizationViewLayout>
        <p className="text-sm text-slate-500">Loading payment…</p>
      </OrganizationViewLayout>
    );
  }

  if (detailQuery.isError || !detailQuery.data) {
    return (
      <OrganizationViewLayout>
        <SubPageBackLink
          href={financeVendorPaymentsListHref}
          label="Vendor payments"
        />
        <p className="text-sm text-red-700">Vendor payment not found.</p>
      </OrganizationViewLayout>
    );
  }

  const payment = detailQuery.data;

  return (
    <OrganizationViewLayout>
      <SubPageBackLink
        href={financeVendorPaymentsListHref}
        label="Vendor payments"
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[15px] font-semibold text-gray-900">
            {payment.paymentNumber}
          </h1>
          <p className="text-sm text-slate-600">
            {payment.vendorName} · {payment.purchaseInvoiceNumber}
          </p>
        </div>
        {canRemove && payment.availableActions.remove ? (
          <Button
            type="button"
            variant="secondary"
            onClick={() => setRemoveOpen(true)}
            disabled={removeMutation.isPending}
          >
            Remove
          </Button>
        ) : null}
      </div>

      <OrganizationDetailCard>
        <OrganizationDetailFieldGrid>
          <DetailField label="Payment ID" value={payment.paymentNumber} />
          <DetailField label="Date" value={payment.paymentDate} />
          <DetailField
            label="Amount"
            value={formatInrFromMinor(payment.amountMinor)}
          />
          <DetailField
            label="Method"
            value={
              payment.paymentMethodLabel ?? payment.paymentMethod ?? "—"
            }
          />
          <DetailField
            label="Reference"
            value={payment.paymentReference ?? "—"}
          />
          <DetailField
            label="Purchase invoice"
            value={payment.purchaseInvoiceNumber}
          />
          <DetailField label="Vendor" value={payment.vendorName} />
        </OrganizationDetailFieldGrid>
        <p className="mt-3 text-sm">
          <Link
            href={financeInvoiceDetailHref(payment.purchaseInvoiceId)}
            className="font-medium text-[#FE5720] hover:underline"
          >
            View purchase invoice
          </Link>
        </p>
      </OrganizationDetailCard>

      <OrganizationDetailCard className="mt-4">
        <h2 className="mb-4 text-sm font-semibold text-gray-900">
          Invoice after this payment
        </h2>
        <OrganizationDetailFieldGrid>
          <DetailField
            label="Paid to date"
            value={formatInrFromMinor(payment.purchaseInvoice.amountPaidMinor)}
          />
          <DetailField
            label="Balance due"
            value={formatInrFromMinor(payment.purchaseInvoice.balanceDueMinor)}
          />
          <DetailField
            label="Invoice status"
            value={payment.purchaseInvoice.status.replace(/_/g, " ")}
          />
        </OrganizationDetailFieldGrid>
      </OrganizationDetailCard>

      <ConfirmDialog
        open={removeOpen}
        title="Remove vendor payment?"
        message={`${formatInrFromMinor(payment.amountMinor)} via ${payment.paymentMethodLabel ?? payment.paymentMethod ?? "payment"} on ${payment.paymentDate} for ${payment.purchaseInvoiceNumber}. Paid-to-date on the invoice will revert by this amount.`}
        confirmLabel="Remove"
        cancelLabel="Keep payment"
        variant="destructive"
        isConfirmPending={removeMutation.isPending}
        onConfirm={() => removeMutation.mutate()}
        onClose={() => setRemoveOpen(false)}
      />
    </OrganizationViewLayout>
  );
}
