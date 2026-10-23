"use client";
import { navigateToEntityShell } from "@/lib/navigation/secure-entity-navigation";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useOrganisationEntityId } from "@/lib/navigation/use-organisation-entity-id";
import {
  organisationClientDetailHref,
} from "@/lib/navigation/organisation-static-routes";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { invalidateClientCaches } from "@/lib/query/invalidate-domain-caches";

import { useAuth } from "@/providers/auth-provider";
import {
  buildClientPayloadFromForm,
  clientDetailToFormData,
  fetchOrganisationClientByIdApi,
  updateOrganisationClientApi,
} from "@/lib/api/organisation/clients";
import {
  CLIENT_SAVE_ERROR,
  getApiErrorMessage,
  showApiErrorToast,
  showClientUpdatedToast,
} from "@/lib/toast/show-toast";

import CreateClientPage, {
  type ClientFormData,
} from "@/components/modules/organization/clients/CreateClientPage";
import {
  LoadingState,
  RedirectingState,
} from "@/components/states/async-states";

export default function EditClientPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const {
    token,
    organizationId,
    isLoading: isAuthLoading,
    permissions,
  } = useAuth();

  const clientId = useOrganisationEntityId("clientId");

  const canUpdate =
    permissions.has("organisation.update") ||
    permissions.has("organisation.manage");

  const clientQuery = useQuery({
    queryKey: ["organization", "client", organizationId, clientId],
    queryFn: () => {
      if (!token || !organizationId) {
        throw new Error("Missing auth context");
      }
      return fetchOrganisationClientByIdApi(token, organizationId, clientId);
    },
    enabled: !!token && !!organizationId && !isAuthLoading,
  });

  useEffect(() => {
    const detail = clientQuery.data;
    if (!detail) {
      return;
    }
    if (!detail.isActive || detail.status === "inactive") {
      navigateToEntityShell(router, organisationClientDetailHref(clientId), clientId, 'replace');
    }
  }, [clientQuery.data, clientId, router]);

  const initialData = useMemo(() => {
    if (!clientQuery.data) {
      return undefined;
    }
    return clientDetailToFormData(clientQuery.data);
  }, [clientQuery.data]);

  const handleCancel = () => {
    navigateToEntityShell(router, organisationClientDetailHref(clientId), clientId, 'push');
  };

  const handleSaved = async (data: ClientFormData) => {
    if (!token || !organizationId) {
      throw new Error("Missing auth context");
    }

    let payload;
    try {
      const full = buildClientPayloadFromForm({
        organizationId,
        clientName: data.companyName,
        address: data.address,
        pointsOfContact: data.pointsOfContact,
      });
      const { organizationId: payloadOrgId, ...updatePayload } = full;
      void payloadOrgId;
      payload = updatePayload;
    } catch (error) {
      showApiErrorToast(error, CLIENT_SAVE_ERROR);
      throw error;
    }

    try {
      const updated = await updateOrganisationClientApi(
        token,
        organizationId,
        clientId,
        payload,
      );
      await invalidateClientCaches(queryClient);
      showClientUpdatedToast(updated.clientName);
      navigateToEntityShell(router, organisationClientDetailHref(clientId), clientId, 'push');
    } catch (error) {
      showApiErrorToast(error, CLIENT_SAVE_ERROR);
      throw error;
    }
  };

  if (isAuthLoading || clientQuery.isLoading) {
    return (
      <div className="min-h-[40vh]">
        <LoadingState label="Loading client…" />
      </div>
    );
  }

  if (!canUpdate) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-gray-500">
        You do not have permission to edit clients.
      </div>
    );
  }

  if (clientQuery.isError || !clientQuery.data || !initialData) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-2 text-center">
        <p className="text-sm font-medium text-red-600">
          {getApiErrorMessage(clientQuery.error, "Client not found.")}
        </p>
        <button
          type="button"
          onClick={() => void clientQuery.refetch()}
          className="text-sm text-gray-600 underline"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!clientQuery.data.isActive || clientQuery.data.status === "inactive") {
    return (
      <RedirectingState label="Inactive clients cannot be edited. Redirecting…" />
    );
  }

  return (
    <CreateClientPage
      key={clientId}
      mode="edit"
      initialData={initialData}
      onCancel={handleCancel}
      onSaved={handleSaved}
    />
  );
}
