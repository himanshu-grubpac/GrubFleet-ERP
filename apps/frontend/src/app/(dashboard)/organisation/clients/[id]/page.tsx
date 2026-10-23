"use client";

import { useEffect } from "react";
import { RedirectingState } from "@/components/states/async-states";
import { useParams, useRouter } from "next/navigation";
import { navigateToEntityShell } from "@/lib/navigation/secure-entity-navigation";
import { organisationClientDetailHref } from "@/lib/navigation/organisation-static-routes";

export default function ClientLegacyDetailRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = String(params.id ?? "").trim();

  useEffect(() => {
    if (!clientId) {
      router.replace("/organisation/clients/");
      return;
    }
    navigateToEntityShell(
      router,
      organisationClientDetailHref(clientId),
      clientId,
      "replace",
    );
  }, [clientId, router]);

  return <RedirectingState />;
}
