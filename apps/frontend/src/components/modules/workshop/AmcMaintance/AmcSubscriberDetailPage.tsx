"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import Button from "@/components/ui/GrubpacButton";
import { fetchWorkshopAmcSubscriberByCodeApi } from "@/lib/api/workshop/amc";
import { useWorkshopEntityId } from "@/lib/navigation/use-workshop-entity-id";
import {
  workshopAmcMaintenanceListHref,
  workshopAmcTierDetailHref,
} from "@/lib/navigation/workshop-static-routes";
import { useAuth } from "@/providers/auth-provider";

export default function AmcSubscriberDetailPage() {
  const router = useRouter();
  const subscriberCode = useWorkshopEntityId("subscriberCode");
  const { token, organizationId, isLoading: isAuthLoading } = useAuth();

  const detailQuery = useQuery({
    queryKey: [
      "workshop",
      "amc-subscriber",
      organizationId,
      subscriberCode,
    ],
    queryFn: () =>
      fetchWorkshopAmcSubscriberByCodeApi(
        token!,
        organizationId!,
        subscriberCode,
      ),
    enabled:
      !!token && !!organizationId && !!subscriberCode.trim() && !isAuthLoading,
  });

  const subscriber = detailQuery.data;

  return (
    <div className="min-h-full bg-gray-50 px-5 py-4 text-[14px] text-gray-800">
      <div className="mb-5 flex items-center gap-2 text-xs text-gray-500">
        <button
          type="button"
          onClick={() => router.push(workshopAmcMaintenanceListHref)}
          className="hover:text-[#FE5720]"
        >
          AMC &amp; Maintenance
        </button>
        <span>/</span>
        <span className="text-gray-800">
          {subscriberCode.trim() || "Subscriber"}
        </span>
      </div>

      {detailQuery.isLoading && (
        <p className="text-xs text-gray-500">Loading subscriber…</p>
      )}

      {detailQuery.isError && (
        <div>
          <h1 className="text-[14px] font-semibold text-gray-900">
            Subscriber not found
          </h1>
          <p className="mt-2 text-xs text-gray-500">
            No AMC subscription matches fleet code &quot;{subscriberCode}&quot;.
          </p>
        </div>
      )}

      {subscriber && (
        <>
          <header className="mb-5">
            <h1 className="text-[14px] font-semibold text-gray-900">
              {subscriber.fleetCode}
            </h1>
            <p className="mt-1 text-xs text-gray-500">
              {subscriber.registrationNumber} · {subscriber.assetClassName}
            </p>
          </header>

          <section className="w-full rounded-lg border border-gray-200 bg-white p-4 text-xs">
            <dl className="grid gap-3 sm:grid-cols-2">
              <div>
                <dt className="font-medium text-gray-500">AMC tier</dt>
                <dd className="mt-0.5 text-gray-900">
                  <button
                    type="button"
                    className="text-[#FE5720] hover:underline"
                    onClick={() =>
                      router.push(workshopAmcTierDetailHref(subscriber.amcTierId))
                    }
                  >
                    {subscriber.tierName}
                  </button>
                </dd>
              </div>
              <div>
                <dt className="font-medium text-gray-500">Status</dt>
                <dd className="mt-0.5 capitalize text-gray-900">
                  {subscriber.status}
                </dd>
              </div>
              {subscriber.priceDisplayLabel ? (
                <div>
                  <dt className="font-medium text-gray-500">Plan price</dt>
                  <dd className="mt-0.5 text-gray-900">
                    {subscriber.priceDisplayLabel}
                  </dd>
                </div>
              ) : null}
              {subscriber.startedAt ? (
                <div>
                  <dt className="font-medium text-gray-500">Started</dt>
                  <dd className="mt-0.5 text-gray-900">{subscriber.startedAt}</dd>
                </div>
              ) : null}
            </dl>
            {subscriber.tierDescription ? (
              <p className="mt-4 border-t border-gray-100 pt-3 text-gray-600">
                {subscriber.tierDescription}
              </p>
            ) : null}
          </section>
        </>
      )}

      <Button
        type="button"
        variant="secondary"
        className="mt-5"
        onClick={() => router.push(workshopAmcMaintenanceListHref)}
      >
        <ArrowLeft size={14} className="mr-2 inline" />
        Back to AMC &amp; Maintenance
      </Button>
    </div>
  );
}
