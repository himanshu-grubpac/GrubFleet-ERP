"use client";

import { useEffect } from "react";
import { RedirectingState } from "@/components/states/async-states";
import { useParams, useRouter } from "next/navigation";
import { navigateToEntityShell } from "@/lib/navigation/secure-entity-navigation";
import { organisationEmployeeEditHref } from "@/lib/navigation/organisation-static-routes";

export default function EmployeeLegacyEditRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const employeeId = String(params.id ?? "").trim();

  useEffect(() => {
    if (!employeeId) {
      router.replace("/organisation/employees/");
      return;
    }
    navigateToEntityShell(
      router,
      organisationEmployeeEditHref(employeeId),
      employeeId,
      "replace",
    );
  }, [employeeId, router]);

  return <RedirectingState />;
}
