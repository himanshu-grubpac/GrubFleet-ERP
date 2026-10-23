"use client";

import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/providers/auth-provider";
import { fetchStockBalanceDetailApi } from "@/lib/api/inventory/stock-balance";
import { useInventoryEntityId } from "@/lib/navigation/use-inventory-entity-id";
import {
  DashboardDetailErrorShell,
  DashboardPageLoadingShell,
} from "@/components/dashboard/dashboard-async-states";

export default function StockViewPage() {
  const partId = useInventoryEntityId("partId");
  const { token, organizationId, isLoading: isAuthLoading } = useAuth();

  const detailQuery = useQuery({
    queryKey: ["inventory", "stock-balance", organizationId, partId],
    queryFn: () =>
      fetchStockBalanceDetailApi(organizationId!, partId, token!),
    enabled:
      !!token && !!organizationId && !isAuthLoading && !!partId.trim(),
  });

  if (!partId.trim()) {
    return (
      <div className="p-6">
        <p className="text-sm text-gray-500">Stock balance not found.</p>
      </div>
    );
  }

  if (detailQuery.isLoading || isAuthLoading) {
    return (
      <div className="p-6">
        <DashboardPageLoadingShell label="Loading stock balance…" />
      </div>
    );
  }

  if (detailQuery.isError || !detailQuery.data) {
    return (
      <div className="p-6">
        <DashboardDetailErrorShell
          title="Failed to load stock balance"
          error={detailQuery.error}
          fallbackMessage="Stock balance not found."
          onRetry={() => void detailQuery.refetch()}
        />
      </div>
    );
  }

  const stock = detailQuery.data;

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">{stock.partName}</h1>
        <p className="text-sm text-gray-500">{stock.partNumber}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500">On hand</p>
          <p className="text-lg font-semibold">{stock.onHand}</p>
        </div>
        <div className="rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500">Threshold</p>
          <p className="text-lg font-semibold">{stock.threshold}</p>
        </div>
        <div className="rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500">Status</p>
          <p className="text-lg font-semibold">{stock.stockStatus}</p>
        </div>
      </div>
      <div>
        <h2 className="mb-2 text-sm font-semibold text-gray-800">
          By location
        </h2>
        <ul className="divide-y rounded-lg border border-gray-200">
          {stock.locations.map((loc) => (
            <li
              key={loc.location}
              className="flex justify-between px-4 py-3 text-sm"
            >
              <span>{loc.location}</span>
              <span className="font-medium">{loc.quantity}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
