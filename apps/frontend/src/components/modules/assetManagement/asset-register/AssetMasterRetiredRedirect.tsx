"use client";
import { navigateToEntityShell } from "@/lib/navigation/secure-entity-navigation";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { RedirectingState } from "@/components/states/async-states";
import { internalHref } from "@/lib/navigation/nav-path-match";

export default function AssetMasterRetiredRedirect() {
  const router = useRouter();

  useEffect(() => {
    navigateToEntityShell(router, internalHref("/asset-register/assestclass/"), "/asset-register/assestclass/", 'replace');
  }, [router]);

  return (
    <RedirectingState label="Asset Master has been merged into Asset Class. Redirecting…" />
  );
}
