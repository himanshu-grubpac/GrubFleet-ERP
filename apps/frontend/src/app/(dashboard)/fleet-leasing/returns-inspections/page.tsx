"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { RedirectingState } from "@/components/states/async-states";

/** Legacy fleet nav — vehicle returns live under Asset Management. */
export default function FleetReturnsInspectionsLegacyRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/asset-register/vehicle-returns/");
  }, [router]);

  return <RedirectingState />;
}
