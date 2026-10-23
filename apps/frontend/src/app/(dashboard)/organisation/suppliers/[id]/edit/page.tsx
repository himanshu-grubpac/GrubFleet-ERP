"use client";

import { useEffect } from "react";
import { RedirectingState } from "@/components/states/async-states";
import { useParams, useRouter } from "next/navigation";
import { navigateToEntityShell } from "@/lib/navigation/secure-entity-navigation";
import { organisationSupplierEditHref } from "@/lib/navigation/organisation-static-routes";

export default function SupplierLegacyEditRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const supplierId = String(params.id ?? "").trim();

  useEffect(() => {
    if (!supplierId) {
      router.replace("/organisation/suppliers/");
      return;
    }
    navigateToEntityShell(
      router,
      organisationSupplierEditHref(supplierId),
      supplierId,
      "replace",
    );
  }, [supplierId, router]);

  return <RedirectingState />;
}
