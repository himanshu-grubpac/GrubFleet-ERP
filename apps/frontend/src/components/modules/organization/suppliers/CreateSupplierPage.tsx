"use client";
import { navigateToEntityShell } from "@/lib/navigation/secure-entity-navigation";

import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { invalidateSupplierCaches } from "@/lib/query/invalidate-domain-caches";

import { useAuth } from "@/providers/auth-provider";
import {
    buildSupplierPayloadFromForm,
    createOrganisationSupplierApi,
} from "@/lib/api/organisation/suppliers";
import {
    SUPPLIER_SAVE_ERROR,
    showApiErrorToast,
    showSupplierCreatedToast,
} from "@/lib/toast/show-toast";
import { organisationSupplierDetailHref } from "@/lib/navigation/organisation-static-routes";

import CreateSupplierForm, {
    type SupplierFormData,
} from "@/components/modules/organization/suppliers/CreateSupplierForm";

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

    const handleSaved = async (data: SupplierFormData) => {
        if (!token || !organizationId) {
            throw new Error("Missing auth context");
        }

        let payload;
        try {
            payload = buildSupplierPayloadFromForm({
                organizationId,
                name: data.name,
                type: data.type,
                contactPerson: data.contactPerson,
                phone: data.phone,
                email: data.email,
                agreementReference: data.agreementReference,
                address: data.address,
            });
        } catch (error) {
            showApiErrorToast(error, SUPPLIER_SAVE_ERROR);
            throw error;
        }

        try {
            const created = await createOrganisationSupplierApi(token, payload);
            await invalidateSupplierCaches(queryClient);
            showSupplierCreatedToast(created.name);
            navigateToEntityShell(router, organisationSupplierDetailHref(created.id), created.id, 'push');
        } catch (error) {
            showApiErrorToast(error, SUPPLIER_SAVE_ERROR);
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
                You do not have permission to add suppliers.
            </div>
        );
    }

    return <CreateSupplierForm onSaved={handleSaved} />;
}
