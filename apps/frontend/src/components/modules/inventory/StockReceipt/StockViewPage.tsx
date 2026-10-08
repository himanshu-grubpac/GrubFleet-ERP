"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import Button from "@/components/ui/GrubpacButton";
import { useAuth } from "@/providers/auth-provider";
import { fetchStockReceiptDetailApi } from "@/lib/api/inventory/stock-receipts";
import { formatInrFromMinor } from "@/lib/format/money-format";

export default function StockViewPage() {
  const params = useParams();
  const router = useRouter();
  const receiptId = String(params.id);
  const { token, organizationId, isLoading: isAuthLoading, permissions } =
    useAuth();

  const canUpdate =
    permissions.has("inventory.update") ||
    permissions.has("inventory.manage");

  const detailQuery = useQuery({
    queryKey: ["inventory", "stock-receipts", organizationId, receiptId],
    queryFn: () =>
      fetchStockReceiptDetailApi(organizationId!, receiptId, token!),
    enabled: !!token && !!organizationId && !isAuthLoading,
  });

  if (detailQuery.isLoading || isAuthLoading) {
    return (
      <div className="p-6">
        <p className="text-sm text-gray-500">Loading receipt…</p>
      </div>
    );
  }

  if (detailQuery.isError || !detailQuery.data) {
    return (
      <div className="p-6">
        <p className="text-sm text-gray-500">Stock receipt not found.</p>
      </div>
    );
  }

  const receipt = detailQuery.data;

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">
            {receipt.receiptNumber}
          </h1>
          <p className="text-sm text-gray-500">{receipt.partLabel}</p>
        </div>
        {canUpdate && receipt.availableActions.edit ? (
          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              router.push(`/inventory/stock-receipt/${receiptId}/edit`)
            }
          >
            Edit
          </Button>
        ) : null}
      </div>
      <dl className="grid gap-3 sm:grid-cols-2">
        <div>
          <dt className="text-xs text-gray-500">Location</dt>
          <dd className="text-sm font-medium">{receipt.locationName}</dd>
        </div>
        <div>
          <dt className="text-xs text-gray-500">Quantity</dt>
          <dd className="text-sm font-medium">{receipt.quantityReceived}</dd>
        </div>
        <div>
          <dt className="text-xs text-gray-500">Unit cost</dt>
          <dd className="text-sm font-medium">
            {formatInrFromMinor(receipt.unitCostMinor)}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-gray-500">Purchase date</dt>
          <dd className="text-sm font-medium">{receipt.purchaseDate}</dd>
        </div>
        <div>
          <dt className="text-xs text-gray-500">Batch / lot</dt>
          <dd className="text-sm font-medium">
            {receipt.batchLotReference ?? "—"}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-gray-500">Purchase invoice</dt>
          <dd className="text-sm font-medium">
            {receipt.purchaseInvoiceReference ?? "—"}
          </dd>
        </div>
      </dl>
      {receipt.notes ? (
        <div>
          <p className="text-xs text-gray-500">Notes</p>
          <p className="text-sm text-gray-800">{receipt.notes}</p>
        </div>
      ) : null}
    </div>
  );
}
