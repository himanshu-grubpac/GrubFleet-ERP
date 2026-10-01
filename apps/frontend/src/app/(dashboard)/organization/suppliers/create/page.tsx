"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import CreateSupplierForm, {
  type SupplierFormData,
} from "@/components/modules/organization/suppliers/CreateSupplierForm";
import { useAuth } from "@/providers/auth-provider";
import {
  buildSupplierPayloadFromForm,
  createOrganisationSupplierApi,
} from "@/lib/api/organisation/suppliers";
import { ApiClientError } from "@/lib/api/client";
import { showSupplierCreatedToast } from "@/lib/toast/show-toast";

export default function CreateSupplierPage() {
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

  useEffect(() => {
    if (!isAuthLoading && !canCreate) {
      router.replace("/organization/suppliers");
    }
  }, [isAuthLoading, canCreate, router]);

  const createMutation = useMutation({
    mutationFn: async (data: SupplierFormData) => {
      if (!token || !organizationId) {
        throw new Error("Missing auth context");
      }
      const payload = buildSupplierPayloadFromForm({
        organizationId,
        ...data,
      });
      return createOrganisationSupplierApi(token, payload);
    },
    onSuccess: (supplier) => {
      void queryClient.invalidateQueries({
        queryKey: ["organization", "suppliers"],
      });
      if (organizationId) {
        queryClient.setQueryData(
          ["organization", "supplier", organizationId, supplier.id],
          supplier,
        );
      }
      showSupplierCreatedToast(supplier.name);
      router.push(`/organization/suppliers/${supplier.id}`);
    },
  });

  const handleSaved = async (data: SupplierFormData) => {
    try {
      await createMutation.mutateAsync(data);
    } catch (error) {
      if (error instanceof ApiClientError) {
        throw error;
      }
      throw new Error("Failed to save supplier.");
    }
  };

  if (isAuthLoading || !canCreate) {
    return (
      <div className="min-h-[320px] animate-pulse bg-gray-100" aria-busy="true" />
    );
  }

  return (
    <CreateSupplierForm
      mode="create"
      onSaved={handleSaved}
    />
  );
}
