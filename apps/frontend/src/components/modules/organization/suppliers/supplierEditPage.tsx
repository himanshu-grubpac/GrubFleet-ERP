"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import CreateSupplierForm, {
  type SupplierFormData,
} from "@/components/modules/organization/suppliers/CreateSupplierForm";
import { useAuth } from "@/providers/auth-provider";
import {
  buildSupplierPayloadFromForm,
  fetchOrganisationSupplierByIdApi,
  updateOrganisationSupplierApi,
} from "@/lib/api/organisation/suppliers";
import { ApiClientError } from "@/lib/api/client";
import { showSupplierUpdatedToast } from "@/lib/toast/show-toast";

export default function EditSupplierPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const supplierId = String(params.id);

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
      router.replace(`/organization/suppliers/${supplierId}`);
    }
  }, [isAuthLoading, canUpdate, router, supplierId]);

  const supplierQuery = useQuery({
    queryKey: ["organization", "supplier", organizationId, supplierId],
    queryFn: () => {
      if (!token || !organizationId) {
        throw new Error("Missing auth context");
      }
      return fetchOrganisationSupplierByIdApi(
        token,
        organizationId,
        supplierId,
      );
    },
    enabled: !!token && !!organizationId && !isAuthLoading,
  });

  useEffect(() => {
    const supplier = supplierQuery.data;
    if (!supplier || supplier.status === "active") return;
    router.replace(`/organization/suppliers/${supplierId}`);
  }, [supplierQuery.data, supplierId, router]);

  const updateMutation = useMutation({
    mutationFn: async (data: SupplierFormData) => {
      if (!token || !organizationId) {
        throw new Error("Missing auth context");
      }
      const payload = buildSupplierPayloadFromForm({
        organizationId,
        ...data,
      });
      return updateOrganisationSupplierApi(token, organizationId, supplierId, {
        name: payload.name,
        supplierType: payload.supplierType,
        contactPerson: payload.contactPerson,
        contactPhone: payload.contactPhone,
        contactEmail: payload.contactEmail,
        agreementReference: payload.agreementReference,
        addressLine1: payload.addressLine1,
        addressLine2: payload.addressLine2,
        addressCity: payload.addressCity,
        addressCountry: payload.addressCountry,
        addressState: payload.addressState,
        addressDistrict: payload.addressDistrict,
        addressPincode: payload.addressPincode,
      });
    },
    onSuccess: (updated) => {
      void queryClient.invalidateQueries({
        queryKey: ["organization", "suppliers"],
      });
      void queryClient.invalidateQueries({
        queryKey: ["organization", "supplier", organizationId, supplierId],
      });
      queryClient.setQueryData(
        ["organization", "supplier", organizationId, supplierId],
        updated,
      );
      showSupplierUpdatedToast(updated.name);
      router.push(`/organization/suppliers/${supplierId}`);
    },
  });

  const isInactiveSupplier =
    supplierQuery.data != null && supplierQuery.data.status !== "active";

  if (
    isAuthLoading ||
    !canUpdate ||
    supplierQuery.isLoading ||
    isInactiveSupplier
  ) {
    return (
      <div className="min-h-[320px] animate-pulse bg-gray-100" aria-busy="true" />
    );
  }

  if (supplierQuery.isError || !supplierQuery.data) {
    return (
      <div className="p-6">
        <p className="text-sm text-red-600" role="alert">
          {supplierQuery.error instanceof Error
            ? supplierQuery.error.message
            : "Supplier not found."}
        </p>
      </div>
    );
  }

  const supplier = supplierQuery.data;

  const initialData: SupplierFormData = {
    name: supplier.name,
    type: supplier.type,
    contactPerson: supplier.contactPerson,
    phone: supplier.phone,
    email: supplier.email,
    agreementReference: supplier.agreementReference,
    address: {
      line1: supplier.addressLine1,
      line2: supplier.addressLine2 ?? "",
      city: supplier.addressCity ?? "",
      state: supplier.addressState ?? "",
      district: supplier.addressDistrict ?? "",
      pincode: supplier.addressPincode ?? "",
      country: supplier.addressCountry ?? "IN",
    },
  };

  const handleSaved = async (data: SupplierFormData) => {
    try {
      await updateMutation.mutateAsync(data);
    } catch (error) {
      if (error instanceof ApiClientError) {
        throw error;
      }
      throw new Error("Failed to save supplier.");
    }
  };

  return (
    <CreateSupplierForm
      mode="edit"
      initialData={initialData}
      onSaved={handleSaved}
    />
  );
}
