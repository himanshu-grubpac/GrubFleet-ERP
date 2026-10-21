
"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";

import OrganizationFormLayout from "@/components/common/OrganizationFormLayout";
import Button from "@/components/ui/GrubpacButton";
import {
  FormFieldInlineError,
  mergeFormControlBorderClass,
} from "@/components/ui/form-field-inline-error";
import { RestrictedInput } from "@/components/ui/RestrictedInput";
import { fetchAssetRegisterAssetClassesApi } from "@/lib/api/asset-register/asset-classes";
import { ApiClientError } from "@/lib/api/client";
import { createWorkshopMaintenanceScheduleApi } from "@/lib/api/workshop/amc";
import { WORKSHOP_INPUT_LIMITS } from "@/lib/forms/restricted-input";
import { dashboardCatalogQueryOptions } from "@/lib/query/dashboard-list-query-options";
import {
  workshopAmcMaintenanceListHref,
  workshopAmcScheduleDetailHref,
} from "@/lib/navigation/workshop-static-routes";
import {
  showErrorToast,
  showSuccessToast,
} from "@/lib/toast/show-toast";
import { useAuth } from "@/providers/auth-provider";

export default function CreateAmcSchedulePage() {
    const router = useRouter();
    const { token, organizationId, permissions, isLoading: isAuthLoading } =
        useAuth();
    const canCreate =
        permissions.has("workshop.create") ||
        permissions.has("workshop.manage");

    const assetClassesQuery = useQuery({
        queryKey: ["workshop", "schedule-asset-classes", organizationId],
        queryFn: () =>
            fetchAssetRegisterAssetClassesApi({
                token: token!,
                organizationId: organizationId!,
                page: 1,
                pageSize: 200,
                status: "active",
            }),
        enabled: !!token && !!organizationId && !isAuthLoading,
        ...dashboardCatalogQueryOptions,
    });
    const assetClasses = assetClassesQuery.data?.items ?? [];

    const [form, setForm] = useState({
        name: "",
        assetClass: "",
        maintenanceType: "Preventive Maintenance",
        intervalType: "Odometer",
        intervalValue: "",
        applicability: "Leased",
        description: "",
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

    const updateField = (field: string, value: string) => {
        setForm((prev) => ({ ...prev, [field]: value }));
        setErrors((prev) => ({ ...prev, [field]: "" }));
    };

    const intervalValueValid = useMemo(() => {
        const trimmed = form.intervalValue.trim();
        if (!trimmed) return false;
        const n = Number(trimmed);
        return Number.isFinite(n) && n > 0;
    }, [form.intervalValue]);

    const createMutation = useMutation({
        mutationFn: (payload: {
            name: string;
            assetClassLabel: string;
            intervalLabel: string;
            maintenanceType: string;
            intervalType: string;
            vehicleApplicability: string;
            description?: string;
        }) =>
            createWorkshopMaintenanceScheduleApi(token!, {
                organizationId: organizationId!,
                ...payload,
            }),
        onSuccess: (data) => {
            showSuccessToast(`${data.name} was created`);
            router.push(workshopAmcScheduleDetailHref(data.id));
        },
        onError: (error: Error) => {
            const message =
                error instanceof ApiClientError
                    ? error.message
                    : "Could not create schedule. Try again.";
            showErrorToast(message);
        },
    });

    const canSubmit =
        canCreate &&
        !!form.name.trim() &&
        !!form.assetClass &&
        intervalValueValid &&
        !createMutation.isPending;

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const nextErrors: Record<string, string> = {};

        if (!form.name.trim()) nextErrors.name = "Schedule name is required.";
        if (!form.assetClass) nextErrors.assetClass = "Select an asset class.";
        if (!form.intervalValue.trim()) {
            nextErrors.intervalValue = "Enter the service interval.";
        } else if (
            !Number.isFinite(Number(form.intervalValue)) ||
            Number(form.intervalValue) <= 0
        ) {
            nextErrors.intervalValue = "Enter a valid positive number.";
        }

        setErrors(nextErrors);

        if (Object.keys(nextErrors).length > 0) return;

        if (!token || !organizationId || !canCreate) {
            showErrorToast("You do not have permission to create schedules.");
            return;
        }

        const intervalSuffix =
            form.intervalType === "Odometer" ? " km" : " days";
        createMutation.mutate({
            name: form.name.trim(),
            assetClassLabel: form.assetClass.trim(),
            intervalLabel: `${form.intervalValue.trim()}${intervalSuffix}`,
            maintenanceType: form.maintenanceType.trim(),
            intervalType: form.intervalType.trim(),
            vehicleApplicability: form.applicability.trim(),
            description: form.description.trim() || undefined,
        });
    };

    return (
        <OrganizationFormLayout
            title="Create maintenance schedule"
            description="Configure maintenance intervals for applicable vehicle classes."
            backLink={{
                label: "Back to AMC & Maintenance",
                href: workshopAmcMaintenanceListHref,
            }}
            contentVariant="plain"
        >
            <form onSubmit={handleSubmit} className="w-full">
                <section className="overflow-hidden rounded-lg border border-gray-200 bg-white">
                    <div className="border-b border-gray-100 px-4 py-3">
                        <h2 className="text-[14px] font-semibold">
                            Schedule Information
                        </h2>
                        <p className="mt-1 text-xs text-gray-500">
                            Enter the schedule details and service threshold.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 gap-x-5 gap-y-4 p-4 sm:grid-cols-2">
                        <FormField label="Schedule name" required error={errors.name}>
                            <RestrictedInput
                                restrictedKind="name"
                                maxLength={WORKSHOP_INPUT_LIMITS.maintenanceScheduleName}
                                value={form.name}
                                onChange={(value) => updateField("name", value)}
                                placeholder="e.g. Cargo bed & hitch inspection"
                                className={mergeFormControlBorderClass(
                                    !!errors.name,
                                    inputClass,
                                )}
                            />
                        </FormField>

                        <FormField
                            label="Asset class"
                            required
                            error={errors.assetClass}
                        >
                            <select
                                value={form.assetClass}
                                onChange={(e) => updateField("assetClass", e.target.value)}
                                className={mergeFormControlBorderClass(
                                    !!errors.assetClass,
                                    inputClass,
                                )}
                                disabled={assetClassesQuery.isLoading}
                            >
                                <option value="">
                                    {assetClassesQuery.isLoading
                                        ? "Loading asset classes…"
                                        : assetClasses.length === 0
                                          ? "No active asset classes"
                                          : "Select asset class"}
                                </option>
                                {assetClasses.map((row) => (
                                    <option key={row.id} value={row.specLabel}>
                                        {row.specLabel}
                                    </option>
                                ))}
                            </select>
                        </FormField>

                        <FormField label="Maintenance type" required>
                            <select
                                value={form.maintenanceType}
                                onChange={(e) =>
                                    updateField("maintenanceType", e.target.value)
                                }
                                className={inputClass}
                            >
                                <option>Preventive Maintenance</option>
                                <option>Inspection</option>
                                <option>Servicing</option>
                            </select>
                        </FormField>

                        <FormField label="Threshold type" required>
                            <select
                                value={form.intervalType}
                                onChange={(e) =>
                                    updateField("intervalType", e.target.value)
                                }
                                className={inputClass}
                            >
                                <option value="Odometer">Odometer (km)</option>
                                <option value="Calendar">Calendar interval (days)</option>
                            </select>
                        </FormField>

                        <FormField
                            label={
                                form.intervalType === "Odometer"
                                    ? "Service interval (km)"
                                    : "Service interval (days)"
                            }
                            required
                            error={errors.intervalValue}
                        >
                            <RestrictedInput
                                restrictedKind="digits"
                                value={form.intervalValue}
                                onChange={(value) =>
                                    updateField("intervalValue", value)
                                }
                                placeholder={
                                    form.intervalType === "Odometer"
                                        ? "e.g. 4000"
                                        : "e.g. 90"
                                }
                                className={mergeFormControlBorderClass(
                                    !!errors.intervalValue,
                                    inputClass,
                                )}
                            />
                        </FormField>

                        <FormField label="Vehicle applicability" required>
                            <select
                                value={form.applicability}
                                onChange={(e) =>
                                    updateField("applicability", e.target.value)
                                }
                                className={inputClass}
                            >
                                <option value="Leased">Leased</option>
                                <option value="Owned">Owned</option>
                                <option value="All">All vehicles</option>
                            </select>
                        </FormField>

                        <div className="sm:col-span-2">
                            <FormField label="Description / Notes">
                                <RestrictedInput
                                    restrictedKind="text"
                                    maxLength={
                                        WORKSHOP_INPUT_LIMITS.maintenanceScheduleDescription
                                    }
                                    value={form.description}
                                    onChange={(value) =>
                                        updateField("description", value)
                                    }
                                    placeholder="Add schedule instructions or notes (optional)"
                                    className={inputClass}
                                />
                            </FormField>
                        </div>
                    </div>
                </section>

                <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={() => router.push(workshopAmcMaintenanceListHref)}
                    >
                        Cancel
                    </Button>

                    <Button type="submit" disabled={!canSubmit}>
                        {createMutation.isPending ? "Saving…" : "Save Schedule"}
                    </Button>
                </div>
            </form>
        </OrganizationFormLayout>
    );
}

const inputClass =
    "h-9 w-full rounded-md border border-gray-200 bg-white px-3 text-[14px] text-gray-800 outline-none placeholder:text-gray-400 focus:border-[#FE5720] focus:ring-1 focus:ring-[#FE5720]/20";

function FormField({
    label,
    required = false,
    error,
    children,
}: {
    label: string;
    required?: boolean;
    error?: string;
    children: React.ReactNode;
}) {
    return (
        <div className="min-w-0">
            <label className="mb-1.5 block text-xs font-medium text-gray-700">
                {label}
                {required && <span className="ml-1 text-red-500">*</span>}
            </label>
            {children}
            <FormFieldInlineError message={error} />
        </div>
    );
}
