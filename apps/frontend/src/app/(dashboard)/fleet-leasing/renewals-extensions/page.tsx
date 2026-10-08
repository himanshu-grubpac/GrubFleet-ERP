"use client";

import DashboardLayout from "@/components/dashboard/DashboardLayout";
import RenewalsExtensionsTable from "@/components/modules/fleet-leasing/renewals-extensions/RenewalsExtensionsTable";

export default function RenewalsExtensionsPage() {
  return (
    <DashboardLayout
      title="Renewals & Extensions"
      description="Active contracts eligible for renewal or term extension."
    >
      <RenewalsExtensionsTable />
    </DashboardLayout>
  );
}
