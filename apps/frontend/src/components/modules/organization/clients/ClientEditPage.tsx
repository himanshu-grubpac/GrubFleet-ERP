"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import CreateClientForm, {
  type ClientFormData,
} from "@/components/modules/organization/clients/CreateClientPage";
import { OrganisationDashboardFormSkeleton } from "@/components/modules/organization/OrganisationDashboardFormSkeleton";
import { useAuth } from "@/providers/auth-provider";
import {
  fetchOrganisationClientByIdApi,
  mapClientDetailToRecord,
  organisationClientsQueryKey,
} from "@/lib/api/organisation/clients";

export default function ClientEditPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = String(params.id);

  const {
    token,
    organizationId,
    isLoading: isAuthLoading,
    permissions,
  } = useAuth();

  const canUpdate =
    permissions.has("organisation.update") ||
    permissions.has("organisation.manage");

  useEffect(() => {
    if (!isAuthLoading && !canUpdate) {
      router.replace(`/organization/clients/${clientId}`);
    }
  }, [isAuthLoading, canUpdate, router, clientId]);

  const clientQuery = useQuery({
    queryKey: [...organisationClientsQueryKey(organizationId ?? ""), "detail", clientId],
    queryFn: async () => {
      if (!token || !organizationId) {
        throw new Error("Organization context is required.");
      }
      const detail = await fetchOrganisationClientByIdApi(
        token,
        organizationId,
        clientId,
      );
      return mapClientDetailToRecord(detail);
    },
    enabled: !!token && !!organizationId && !isAuthLoading,
  });

  useEffect(() => {
    const client = clientQuery.data;
    if (!client || client.status === "active") {
      return;
    }
    router.replace(`/organization/clients/${clientId}`);
  }, [clientQuery.data, clientId, router]);

  if (clientQuery.isLoading || isAuthLoading) {
    return <OrganisationDashboardFormSkeleton />;
  }

  if (clientQuery.isError || !clientQuery.data) {
    return (
      <div className="px-6 py-8">
        <p className="text-sm text-red-600" role="alert">
          {clientQuery.error instanceof Error
            ? clientQuery.error.message
            : "Client not found."}
        </p>
      </div>
    );
  }

  const client = clientQuery.data;
  const initialData: ClientFormData = {
    clientName: client.clientName,
    address: client.address,
    pointsOfContact: client.pointsOfContact,
  };

  return (
    <CreateClientForm
      mode="edit"
      clientId={clientId}
      initialData={initialData}
    />
  );
}
