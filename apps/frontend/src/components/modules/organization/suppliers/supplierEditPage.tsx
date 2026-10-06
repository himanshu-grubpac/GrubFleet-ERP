"use client";

import { useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/providers/auth-provider";
import { ApiClientError } from "@/lib/api/client";
import {
    buildSupplierPayloadFromForm,
    fetchOrganisationSupplierByIdApi,
    supplierDetailToFormData,
    updateOrganisationSupplierApi,
} from "@/lib/api/organisation/suppliers";
import {
    SUPPLIER_SAVE_ERROR,
    showErrorToast,
    showSupplierUpdatedToast,
} from "@/lib/toast/show-toast";

import CreateSupplierForm, {
    type SupplierFormData,
} from "@/components/modules/organization/suppliers/CreateSupplierForm";

export default function EditSupplierPage() {
    const params = useParams();
    const router = useRouter();
    const queryClient = useQueryClient();
    const {
        token,
        organizationId,
        isLoading: isAuthLoading,
        permissions,
    } = useAuth();

    const supplierId = String(params.id);

    const canUpdate =
        permissions.has("organisation.update") ||
        permissions.has("organisation.manage");

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
        const detail = supplierQuery.data;
        if (!detail) {
            return;
        }
        if (!detail.isActive || detail.status === "inactive") {
            router.replace(`/organization/suppliers/${supplierId}`);
        }
    }, [supplierQuery.data, supplierId, router]);

    const initialData = useMemo(() => {
        if (!supplierQuery.data) {
            return undefined;
        }
        return supplierDetailToFormData(supplierQuery.data);
    }, [supplierQuery.data]);

    const handleCancel = () => {
        router.push("/organization/suppliers");
    };

    const handleSaved = async (data: SupplierFormData) => {
        if (!token || !organizationId) {
            throw new Error("Missing auth context");
        }

        let payload;
        try {
            const full = buildSupplierPayloadFromForm({
                organizationId,
                name: data.name,
                type: data.type,
                contactPerson: data.contactPerson,
                phone: data.phone,
                email: data.email,
                agreementReference: data.agreementReference,
                address: data.address,
            });
            const { organizationId: _orgId, ...updatePayload } = full;
            payload = updatePayload;
        } catch {
            showErrorToast(SUPPLIER_SAVE_ERROR);
            throw new Error(SUPPLIER_SAVE_ERROR);
        }

        try {
            const updated = await updateOrganisationSupplierApi(
                token,
                organizationId,
                supplierId,
                payload,
            );
            await queryClient.invalidateQueries({
                queryKey: ["organization", "suppliers"],
            });
            await queryClient.invalidateQueries({
                queryKey: ["organization", "supplier", organizationId, supplierId],
            });
            showSupplierUpdatedToast(updated.name);
            router.push(`/organization/suppliers/${supplierId}`);
        } catch (error) {
            const message =
                error instanceof ApiClientError
                    ? error.message
                    : SUPPLIER_SAVE_ERROR;
            showErrorToast(message);
            throw error;
        }
    };

    if (isAuthLoading || supplierQuery.isLoading) {
        return (
            <div className="flex min-h-[40vh] items-center justify-center text-sm text-gray-500">
                Loading supplier...
            </div>
        );
    }

    if (!canUpdate) {
        return (
            <div className="flex min-h-[40vh] items-center justify-center text-sm text-gray-500">
                You do not have permission to edit suppliers.
            </div>
        );
    }

    if (supplierQuery.isError || !supplierQuery.data || !initialData) {
        return (
            <div className="flex min-h-[40vh] flex-col items-center justify-center gap-2 text-center">
                <p className="text-sm font-medium text-red-600">
                    {supplierQuery.error instanceof ApiClientError
                        ? supplierQuery.error.message
                        : "Supplier not found."}
                </p>
                <button
                    type="button"
                    onClick={() => void supplierQuery.refetch()}
                    className="text-sm text-gray-600 underline"
                >
                    Try again
                </button>
            </div>
        );
    }

    return (
        <CreateSupplierForm
            mode="edit"
            initialData={initialData}
            onCancel={handleCancel}
            onSaved={handleSaved}
        />
    );
}
