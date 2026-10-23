"use client";

import { useRouter } from "next/navigation";
import { navigateToEntityShell } from "@/lib/navigation/secure-entity-navigation";
import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import OrganizationFormLayout from "@/components/common/OrganizationFormLayout";
import FormActions from "@/components/common/FormActions";
import {
    validateRequired,
    validateStringLength,
    hasValidationErrors,
    type ValidationErrors,
} from "@/components/common/Commonvalidation";
import {
    FormFieldInlineError,
    mergeFormControlBorderClass,
} from "@/components/ui/form-field-inline-error";
import { RestrictedInput } from "@/components/ui/RestrictedInput";
import { fetchAllActiveAssetRegisterAssetClassesApi } from "@/lib/api/asset-register/asset-classes";
import { ApiClientError } from "@/lib/api/client";
import { createWorkshopMaintenanceScheduleApi } from "@/lib/api/workshop/amc";
import { WORKSHOP_INPUT_LIMITS } from "@/lib/forms/restricted-input";
import { dashboardCatalogQueryOptions } from "@/lib/query/dashboard-list-query-options";
import { invalidateAmcScheduleCaches } from "@/lib/query/invalidate-domain-caches";
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
    const queryClient = useQueryClient();
    const { token, organizationId, permissions, isLoading: isAuthLoading } =
        useAuth();
    const canCreate =
        permissions.has("workshop.create") ||
        permissions.has("workshop.manage");

    const assetClassesQuery = useQuery({
        queryKey: ["workshop", "schedule-asset-classes", organizationId],
        queryFn: () =>
            fetchAllActiveAssetRegisterAssetClassesApi({
                token: token!,
                organizationId: organizationId!,
            }),
        enabled: !!token && !!organizationId && !isAuthLoading,
        ...dashboardCatalogQueryOptions,
    });
    const assetClasses = assetClassesQuery.data ?? [];

    const [form, setForm] = useState({
        name: "",
        assetClass: "",
        maintenanceType: "Preventive Maintenance",
        intervalType: "Odometer",
        intervalValue: "",
        applicability: "Leased",
        description: "",
    });

    const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
    const isSubmittingRef = useRef(false);

    const updateField = (field: string, value: string) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    };

    const validationErrors: ValidationErrors = useMemo(() => {
        const nextErrors: ValidationErrors = {};

        const nameRequiredError = validateRequired(form.name, "Schedule name");
        if (nameRequiredError) {
            nextErrors.name = nameRequiredError;
        } else {
            const nameLengthError = validateStringLength(form.name, {
                label: "Schedule name",
                required: true,
                maxLength: WORKSHOP_INPUT_LIMITS.maintenanceScheduleName,
            });
            if (nameLengthError) nextErrors.name = nameLengthError;
        }

        const assetClassError = validateRequired(form.assetClass, "Asset class");
        if (assetClassError) nextErrors.assetClass = "Select an asset class.";

        const intervalRequiredError = validateRequired(
            form.intervalValue,
            "Service interval",
        );
        if (intervalRequiredError) {
            nextErrors.intervalValue = "Enter the service interval.";
        } else if (
            !Number.isFinite(Number(form.intervalValue)) ||
            Number(form.intervalValue) <= 0
        ) {
            nextErrors.intervalValue = "Enter a valid positive number.";
        }

        const descriptionLengthError = validateStringLength(form.description, {
            label: "Description / Notes",
            required: false,
            maxLength: WORKSHOP_INPUT_LIMITS.maintenanceScheduleDescription,
        });
        if (descriptionLengthError) nextErrors.description = descriptionLengthError;

        return nextErrors;
    }, [form]);

    const validationSummary = useMemo(
        () => Object.values(validationErrors).filter(Boolean) as string[],
        [validationErrors],
    );

    const getFieldError = (field: string) =>
        hasAttemptedSubmit ? validationErrors[field] : undefined;

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
            isSubmittingRef.current = false;
            void invalidateAmcScheduleCaches(queryClient);
            showSuccessToast(`${data.name} was created`);
            navigateToEntityShell(router, workshopAmcScheduleDetailHref(data.id), data.id, 'push');
        },
        onError: (error: Error) => {
            isSubmittingRef.current = false;
            const message =
                error instanceof ApiClientError
                    ? error.message
                    : "Could not create schedule. Try again.";
            showErrorToast(message);
        },
    });

    const handleSave = () => {
        setHasAttemptedSubmit(true);

        if (hasValidationErrors(validationErrors)) return;
        if (isSubmittingRef.current || createMutation.isPending) return;

        if (!token || !organizationId || !canCreate) {
            showErrorToast("You do not have permission to create schedules.");
            return;
        }

        const intervalSuffix =
            form.intervalType === "Odometer" ? " km" : " days";

        isSubmittingRef.current = true;
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

    const handleCancel = () => {
        router.push(workshopAmcMaintenanceListHref);
    };

    const canSubmit = useMemo(() => {
        if (!canCreate || createMutation.isPending) {
            return false;
        }
        return !hasValidationErrors(validationErrors);
    }, [canCreate, createMutation.isPending, validationErrors]);

    const formActions = (
        <FormActions
            hasAttemptedSubmit={hasAttemptedSubmit}
            validationSummary={validationSummary}
            isSaving={createMutation.isPending}
            canSubmit={canSubmit}
            onCancel={handleCancel}
            onSave={handleSave}
            saveLabel="Save schedule"
            savingLabel="Saving..."
        />
    );

    return (
        <OrganizationFormLayout
            title="Create maintenance schedule"
            description="Configure maintenance intervals for applicable vehicle classes."

            contentVariant="plain"
            actions={formActions}
        >
            <form
                onSubmit={(event) => {
                    event.preventDefault();
                    handleSave();
                }}
                className="w-full"
            >
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
                        <FormField label="Schedule name" required error={getFieldError("name")}>
                            <RestrictedInput
                                restrictedKind="name"
                                maxLength={WORKSHOP_INPUT_LIMITS.maintenanceScheduleName}
                                value={form.name}
                                onChange={(value) => updateField("name", value)}
                                placeholder="e.g. Cargo bed & hitch inspection"
                                className={mergeFormControlBorderClass(
                                    !!getFieldError("name"),
                                    inputClass,
                                )}
                            />
                        </FormField>

                        <FormField
                            label="Asset class"
                            required
                            error={getFieldError("assetClass")}
                        >
                            <select
                                value={form.assetClass}
                                onChange={(e) => updateField("assetClass", e.target.value)}
                                className={mergeFormControlBorderClass(
                                    !!getFieldError("assetClass"),
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
                            error={getFieldError("intervalValue")}
                        >
                            <RestrictedInput
                                restrictedKind="digits"
                                maxLength={
                                    form.intervalType === "Odometer"
                                        ? WORKSHOP_INPUT_LIMITS.workOrderOdometerMaxDigits
                                        : WORKSHOP_INPUT_LIMITS.calendarIntervalDays
                                }
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
                                    !!getFieldError("intervalValue"),
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
                                    className={mergeFormControlBorderClass(
                                        !!getFieldError("description"),
                                        inputClass,
                                    )}
                                />
                                <FormFieldInlineError message={getFieldError("description")} />
                            </FormField>
                        </div>
                    </div>
                </section>

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
