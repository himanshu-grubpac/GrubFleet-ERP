"use client";

import Link from "next/link";

import DashboardLayout from "@/components/dashboard/DashboardLayout";
import LeaseContractsTable from "@/components/modules/fleet-leasing/lease-contracts/LeaseContractsTable";
import Button from "@/components/ui/GrubpacButton";
import { useAuth } from "@/providers/auth-provider";

export default function LeaseContractsPage() {
  const { permissions, isLoading: isAuthLoading } = useAuth();

  const canCreate =
    permissions.has("fleet_leasing.create") ||
    permissions.has("fleet_leasing.manage");

  return (
    <DashboardLayout
      title="Lease Contracts"
      description="Manage fleet and leasing contracts."
      action={
        !isAuthLoading && canCreate ? (
          <Link href="/fleet-leasing/lease-contracts/new">
            <Button type="button">New Contract</Button>
          </Link>
        ) : undefined
      }
    >
      <LeaseContractsTable />
    </DashboardLayout>
  );
}
