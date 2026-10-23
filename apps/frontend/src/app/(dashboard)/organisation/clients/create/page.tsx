"use client";

import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { invalidateClientCaches } from "@/lib/query/invalidate-domain-caches";

import { useAuth } from "@/providers/auth-provider";
import {
  buildClientPayloadFromForm,
  createOrganisationClientApi,
} from "@/lib/api/organisation/clients";
import {
  CLIENT_SAVE_ERROR,
  showApiErrorToast,
  showClientCreatedToast,
} from "@/lib/toast/show-toast";
import { organisationClientDetailHref } from "@/lib/navigation/organisation-static-routes";

import CreateClientPage, {
  type ClientFormData,
} from "@/components/modules/organization/clients/CreateClientPage";

export default function CreateOrganisationClientRoute() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const {
    token,
    organizationId,
    isLoading: isAuthLoading,
    permissions,
  } = useAuth();

  const canCreate =
    permissions.has("organisation.create") ||
    permissions.has("organisation.manage");

  const handleSaved = async (data: ClientFormData) => {
    if (!token || !organizationId) {
      throw new Error("Missing auth context");
    }

    let payload;
    try {
      payload = buildClientPayloadFromForm({
        organizationId,
        clientName: data.companyName,
        address: data.address,
        pointsOfContact: data.pointsOfContact,
      });
    } catch (error) {
      showApiErrorToast(error, CLIENT_SAVE_ERROR);
      throw error;
    }

    try {
      const created = await createOrganisationClientApi(token, payload);
      await invalidateClientCaches(queryClient);
      showClientCreatedToast(created.clientName);
      router.push(organisationClientDetailHref(created.id));
    } catch (error) {
      showApiErrorToast(error, CLIENT_SAVE_ERROR);
      throw error;
    }
  };

  if (isAuthLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-gray-500">
        Loading...
      </div>
    );
  }

  if (!canCreate) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-gray-500">
        You do not have permission to add clients.
      </div>
    );
  }

  return <CreateClientPage onSaved={handleSaved} />;
}
