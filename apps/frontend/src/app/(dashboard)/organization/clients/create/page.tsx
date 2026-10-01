"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import CreateClientPage from "@/components/modules/organization/clients/CreateClientPage";
import { useAuth } from "@/providers/auth-provider";

export default function ClientsCreateRoutePage() {
  const router = useRouter();
  const { isLoading: isAuthLoading, permissions } = useAuth();

  const canCreate =
    permissions.has("organisation.create") ||
    permissions.has("organisation.manage");

  useEffect(() => {
    if (!isAuthLoading && !canCreate) {
      router.replace("/organization/clients");
    }
  }, [isAuthLoading, canCreate, router]);

  if (isAuthLoading || !canCreate) {
    return (
      <div className="min-h-[320px] animate-pulse bg-gray-100" aria-busy="true" />
    );
  }

  return <CreateClientPage mode="create" />;
}
