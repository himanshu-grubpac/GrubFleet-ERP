"use client";
import { navigateToEntityShell } from "@/lib/navigation/secure-entity-navigation";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useOrganisationEntityId } from "@/lib/navigation/use-organisation-entity-id";
import {
    organisationSupplierDetailHref,
} from "@/lib/navigation/organisation-static-routes";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { invalidateSupplierCaches } from "@/lib/query/invalidate-domain-caches";

import { useAuth } from "@/providers/auth-provider";
import {
    buildSupplierPayloadFromForm,
    fetchOrganisationSupplierByIdApi,
    supplierDetailToFormData,
    updateOrganisationSupplierApi,
} from "@/lib/api/organisation/suppliers";
import {
    SUPPLIER_SAVE_ERROR,
    getApiErrorMessage,
    showApiErrorToast,
    showSupplierUpdatedToast,
} from "@/lib/toast/show-toast";
import {
    DashboardDetailErrorShell,
    DashboardPageLoadingShell,
} from "@/components/dashboard/dashboard-async-states";

import CreateSupplierForm, {
    type SupplierFormData,
} from "@/components/modules/organization/suppliers/CreateSupplierForm";

export default function EditSupplierPage() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const {
        token,
        organizationId,
        isLoading: isAuthLoading,
        permissions,
    } = useAuth();

    const supplierId = useOrganisationEntityId("supplierId");

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
            navigateToEntityShell(router, organisationSupplierDetailHref(supplierId), supplierId, 'replace');
        }
    }, [supplierQuery.data, supplierId, router]);

    const initialData = useMemo(() => {
        if (!supplierQuery.data) {
            return undefined;
        }
        return supplierDetailToFormData(supplierQuery.data);
    }, [supplierQuery.data]);

    const handleCancel = () => {
        router.push("/organisation/suppliers");
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
            const { organizationId: payloadOrgId, ...updatePayload } = full;
            void payloadOrgId;
            payload = updatePayload;
        } catch (error) {
            showApiErrorToast(error, SUPPLIER_SAVE_ERROR);
            throw error;
        }

        try {
            const updated = await updateOrganisationSupplierApi(
                token,
                organizationId,
                supplierId,
                payload,
            );
            await invalidateSupplierCaches(queryClient);
            showSupplierUpdatedToast(updated.name);
            navigateToEntityShell(router, organisationSupplierDetailHref(supplierId), supplierId, 'push');
        } catch (error) {
            showApiErrorToast(error, SUPPLIER_SAVE_ERROR);
            throw error;
        }
    };

    if (isAuthLoading || supplierQuery.isLoading) {
        return (
            <div className="px-5 py-4">
                <DashboardPageLoadingShell label="Loading supplier…" />
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
            <div className="px-5 py-4">
                <DashboardDetailErrorShell
                    title="Failed to load supplier"
                    message={getApiErrorMessage(
                        supplierQuery.error,
                        "Supplier not found.",
                    )}
                    onRetry={() => void supplierQuery.refetch()}
                />
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
