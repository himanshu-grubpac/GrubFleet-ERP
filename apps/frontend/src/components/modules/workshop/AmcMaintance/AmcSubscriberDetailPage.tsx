"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { useWorkshopEntityId } from "@/lib/navigation/use-workshop-entity-id";
import { workshopAmcMaintenanceListHref } from "@/lib/navigation/workshop-static-routes";

export default function AmcSubscriberDetailPage() {
  const router = useRouter();
  const subscriberCode = useWorkshopEntityId("subscriberCode");

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

      <h1 className="text-[14px] font-semibold text-gray-900">
        {subscriberCode.trim() || "Subscriber"}
      </h1>
      <p className="mt-2 text-xs text-gray-500">
        Subscriber detail will load from the API when AMC maintenance is
        integrated.
      </p>

      <button
        type="button"
        onClick={() => router.push(workshopAmcMaintenanceListHref)}
        className="mt-5 inline-flex h-8 items-center gap-2 rounded-md border border-gray-200 bg-white px-3 text-xs font-medium hover:bg-gray-50"
      >
        <ArrowLeft size={14} />
        Back to AMC &amp; Maintenance
      </button>
    </div>
  );
}
