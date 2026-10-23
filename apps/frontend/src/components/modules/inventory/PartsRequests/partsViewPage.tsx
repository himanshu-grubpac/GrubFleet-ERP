"use client";

import { useQuery } from "@tanstack/react-query";

import { useInventoryEntityId } from "@/lib/navigation/use-inventory-entity-id";
import { useAuth } from "@/providers/auth-provider";
import { fetchPartsRequestDetailApi } from "@/lib/api/inventory/parts-requests";
import OrganizationViewLayout from "@/components/common/OrganizationViewLayout";

export default function PartsViewPage() {
  const requestId = useInventoryEntityId("partsRequestId");

  const {
    token,
    organizationId,
    isLoading: isAuthLoading,
  } = useAuth();

  const detailQuery = useQuery({
    queryKey: [
      "inventory",
      "parts-requests",
      organizationId,
      requestId,
    ],
    queryFn: () =>
      fetchPartsRequestDetailApi(
        organizationId!,
        requestId,
        token!,
      ),
    enabled:
      !!token &&
      !!organizationId &&
      !isAuthLoading &&
      !!requestId,
  });

  if (detailQuery.isLoading || isAuthLoading) {
    return (
      <div className="p-6">
        <p className="text-sm text-gray-500">
          Loading request…
        </p>
      </div>
    );
  }

  if (detailQuery.isError || !detailQuery.data) {
    return (
      <div className="p-6">
        <p className="text-sm text-gray-500">
          Parts request not found.
        </p>
      </div>
    );
  }

  const request = detailQuery.data;
  const isFulfilled = request.status === "Fulfilled";

  return (
    <OrganizationViewLayout>
      <div className="space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-[15px] font-semibold text-gray-900">
                {request.requestNumber}
              </h1>

              <span
                className={[
                  "rounded-full px-2 py-0.5 text-xs font-medium",
                  isFulfilled
                    ? "bg-green-50 text-green-700"
                    : "bg-red-50 text-red-600",
                ].join(" ")}
              >
                {request.status}
              </span>
            </div>

            <p className="mt-1 text-sm text-gray-500">
              Requested against {request.workOrder}.
            </p>
          </div>
        </div>

        <section>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
            Request
          </h2>

          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
            <InfoRow label="Part" value={request.part} />
            <InfoRow
              label="Quantity requested"
              value={`${request.quantity} ${request.unit}`}
            />
            <InfoRow label="Location" value={request.location} />
            <InfoRow
              label="Type / Vehicle"
              value={`${request.requestType} — ${request.vehicle}`}
            />
          </div>
        </section>

        {!isFulfilled ? (
          <section>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
              Outcome
            </h2>
            <p className="text-sm text-gray-600">
              This request was blocked. The requested quantity was not deducted
              from stock.
            </p>
          </section>
        ) : null}
      </div>
    </OrganizationViewLayout>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-h-[42px] items-center border-b border-gray-100 px-3 last:border-b-0">
      <p className="w-1/2 text-xs font-medium text-gray-500">
        {label}
      </p>

      <p className="w-1/2 text-right text-xs font-medium text-gray-900">
        {value}
      </p>
    </div>
  );
}
