"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/providers/auth-provider";
import { fetchPartsRequestDetailApi } from "@/lib/api/inventory/parts-requests";

export default function PartsViewPage() {
  const params = useParams();
  const requestId = String(params.id);
  const { token, organizationId, isLoading: isAuthLoading } = useAuth();

  const detailQuery = useQuery({
    queryKey: ["inventory", "parts-requests", organizationId, requestId],
    queryFn: () =>
      fetchPartsRequestDetailApi(organizationId!, requestId, token!),
    enabled: !!token && !!organizationId && !isAuthLoading,
  });

  if (detailQuery.isLoading || isAuthLoading) {
    return (
      <div className="p-6">
        <p className="text-sm text-gray-500">Loading request…</p>
      </div>
    );
  }

  if (detailQuery.isError || !detailQuery.data) {
    return (
      <div className="p-6">
        <p className="text-sm text-gray-500">Parts request not found.</p>
      </div>
    );
  }

  const request = detailQuery.data;

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">
          {request.requestNumber}
        </h1>
        <p className="text-sm text-gray-500">{request.workOrder}</p>
      </div>
      <dl className="grid gap-3 sm:grid-cols-2">
        <div>
          <dt className="text-xs text-gray-500">Part</dt>
          <dd className="text-sm font-medium">{request.part}</dd>
        </div>
        <div>
          <dt className="text-xs text-gray-500">Quantity</dt>
          <dd className="text-sm font-medium">
            {request.quantity} {request.unit}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-gray-500">Location</dt>
          <dd className="text-sm font-medium">{request.location}</dd>
        </div>
        <div>
          <dt className="text-xs text-gray-500">Vehicle</dt>
          <dd className="text-sm font-medium">{request.vehicle}</dd>
        </div>
        <div>
          <dt className="text-xs text-gray-500">Type</dt>
          <dd className="text-sm font-medium">{request.requestType}</dd>
        </div>
        <div>
          <dt className="text-xs text-gray-500">Status</dt>
          <dd className="text-sm font-medium">{request.status}</dd>
        </div>
      </dl>
    </div>
  );
}
