"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/providers/auth-provider";
import { ApiClientError } from "@/lib/api/client";
import {
    LOCATION_SAVE_ERROR,
    showErrorToast,
    showLocationCreatedToast,
    showLocationUpdatedToast,
} from "@/lib/toast/show-toast";
import {
  createOrganisationLocationTypeApi,
  deleteOrganisationLocationTypeApi,
  fetchOrganisationLocationTypesApi,
} from "@/lib/api/organisation/location-types";
import {
    createOrganisationLocationApi,
    fetchOrganisationLocationByIdApi,
    updateOrganisationLocationApi,
} from "@/lib/api/organisation/locations";
import {
    Plus,
    X,
    Info,
} from "lucide-react";

import Button from "@/components/ui/GrubpacButton";
import { RestrictedInput } from "@/components/ui/RestrictedInput";
import {
    ORG_INPUT_LIMITS,
    ORG_VALIDATION_MESSAGES,
    isValidOrgEmail,
    isWithinOrgMaxLength,
    orgMaxLengthMessage,
} from "@/lib/validation/org-input-constraints";
import {
    formatPhoneDisplay,
    normalizePhoneForApi,
} from "@/lib/format/phone-format";
import { CountrySelect } from "@/components/geo/CountrySelect";
import { RegionSelect } from "@/components/geo/RegionSelect";
import {
    DEFAULT_COUNTRY_CODE,
    getCountryDefinition,
} from "@/lib/geo/countries";
import {
    getPhonePlaceholder,
    getPostalPlaceholder,
    getPostalRestrictedKindForCountry,
    isValidPostalForCountry,
    postalRequiredMessage,
    postalValidationMessage,
} from "@/lib/geo";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { ErrorState } from "@/components/states/async-states";
import { OrganisationDashboardFormSkeleton } from "@/components/modules/organization/OrganisationDashboardFormSkeleton";
import {
    LOCATIONS_ACTIVE_TAB,
    LOCATIONS_DASHBOARD_TABS,
    LOCATIONS_PAGE_DESCRIPTION,
} from "./locationDashboardLayoutProps";
import {
    fetchOrganisationEmployeesApi,
    type OrganisationEmployeeListItem,
} from "@/lib/api/organisation/employees";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type LocationType = {
    id: string;
    name: string;
    isCustom: boolean;
    isUsed: boolean;
};

type LocationFormData = {
    name: string;

    type: string;

    address: {
        country: string;
        line1: string;
        line2: string;
        state: string;
        district: string;
        pincode: string;
    };

    responsiblePerson: {
        id: string;
        name: string;
        phone: string;
        email: string;
    };

    deputy: {
        id: string;
        name: string;
        phone: string;
        email: string;
    };

    officeContact: {
        phone: string;
        email: string;
    };
};

const UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function employeeIdForApi(id: string): string | undefined {
    return id && UUID_RE.test(id) ? id : undefined;
}

function locationFormValidationError(
    form: LocationFormData,
    locationTypes: LocationType[],
): string | null {
    if (!form.name.trim()) {
        return "Location name is required.";
    }
    if (
        !isWithinOrgMaxLength(
            form.name,
            ORG_INPUT_LIMITS.locationName,
        )
    ) {
        return orgMaxLengthMessage(
            "Location name",
            ORG_INPUT_LIMITS.locationName,
        );
    }
    if (!form.type.trim()) {
        return "Please select a location type.";
    }
    const matchedType = locationTypes.find(
        (type) => type.name.toLowerCase() === form.type.toLowerCase(),
    );
    if (!matchedType) {
        return "Please select a valid location type.";
    }
    if (!form.address.line1.trim()) {
        return "Address Line 1 is required.";
    }
    if (
        !isWithinOrgMaxLength(
            form.address.line1,
            ORG_INPUT_LIMITS.addressLine,
        )
    ) {
        return orgMaxLengthMessage(
            "Address line 1",
            ORG_INPUT_LIMITS.addressLine,
        );
    }
    if (
        form.address.line2.trim() &&
        !isWithinOrgMaxLength(
            form.address.line2,
            ORG_INPUT_LIMITS.addressLine,
        )
    ) {
        return orgMaxLengthMessage(
            "Address line 2",
            ORG_INPUT_LIMITS.addressLine,
        );
    }
    const countryDef = getCountryDefinition(form.address.country);
    if (!form.address.country.trim()) {
        return "Country is required.";
    }
    if (!form.address.state.trim()) {
        return `${countryDef.regionLabel} is required.`;
    }
    if (
        !isWithinOrgMaxLength(
            form.address.state,
            ORG_INPUT_LIMITS.addressRegion,
        )
    ) {
        return orgMaxLengthMessage(
            countryDef.regionLabel,
            ORG_INPUT_LIMITS.addressRegion,
        );
    }
    if (countryDef.showDistrict) {
        if (!form.address.district.trim()) {
            return "District is required.";
        }
        if (
            !isWithinOrgMaxLength(
                form.address.district,
                ORG_INPUT_LIMITS.addressRegion,
            )
        ) {
            return orgMaxLengthMessage(
                "District",
                ORG_INPUT_LIMITS.addressRegion,
            );
        }
    } else if (
        form.address.district.trim() &&
        !isWithinOrgMaxLength(
            form.address.district,
            ORG_INPUT_LIMITS.addressRegion,
        )
    ) {
        return orgMaxLengthMessage("District", ORG_INPUT_LIMITS.addressRegion);
    }
    const pincode = form.address.pincode.trim();
    if (!pincode) {
        return postalRequiredMessage(form.address.country);
    }
    if (!isValidPostalForCountry(form.address.country, pincode)) {
        return postalValidationMessage(form.address.country);
    }

    const responsibleId = employeeIdForApi(form.responsiblePerson.id);
    const deputyId = employeeIdForApi(form.deputy.id);
    if (responsibleId && deputyId && responsibleId === deputyId) {
        return "Responsible person and deputy must be different employees.";
    }

    const officePhone = normalizePhoneForApi(
        form.officeContact.phone,
        countryDef.phoneDefaultCountry,
    );
    const officeEmail = form.officeContact.email.trim();
    if (officePhone.length > ORG_INPUT_LIMITS.phone) {
        return orgMaxLengthMessage(
            "Office contact phone",
            ORG_INPUT_LIMITS.phone,
        );
    }
    if (officeEmail && !isValidOrgEmail(officeEmail)) {
        return ORG_VALIDATION_MESSAGES.emailInvalid;
    }

    return null;
}

function isLocationFormValid(
    form: LocationFormData,
    locationTypes: LocationType[],
): boolean {
    return locationFormValidationError(form, locationTypes) === null;
}

function contactFromEmployeeSelection(
    employeeId: string,
    employees: OrganisationEmployeeListItem[],
    fallback?: { name?: string; phone?: string; email?: string },
): LocationFormData["responsiblePerson"] {
    if (!employeeId) {
        return { id: "", name: "", phone: "", email: "" };
    }
    const employee = employees.find((row) => row.id === employeeId);
    return {
        id: employeeId,
        name: employee?.fullName ?? fallback?.name ?? "",
        phone: employee?.phone ?? fallback?.phone ?? "",
        email: employee?.email ?? fallback?.email ?? "",
    };
}

const SELECT_FIELD_CLASS =
    "h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none focus:border-[#FE5720] focus:ring-1 focus:ring-[#FE5720]/20";

const INPUT_FIELD_CLASS =
    "h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-[#FE5720] focus:ring-1 focus:ring-[#FE5720]/20";

const READONLY_FIELD_CLASS =
    "h-10 w-full cursor-default rounded-md border border-gray-200 bg-gray-50 px-3 text-sm text-gray-700 outline-none placeholder:text-gray-400";

const TYPE_CHIP_SELECTED_CLASS =
    "border-[#FE5720] bg-[#FE5720]/10 text-[#FE5720]";

const TYPE_CHIP_DEFAULT_CLASS =
    "border-gray-300 bg-white text-gray-700 hover:bg-gray-50";

function FieldLabel({
    htmlFor,
    required,
    children,
}: {
    htmlFor?: string;
    required?: boolean;
    children: ReactNode;
}) {
    return (
        <label
            htmlFor={htmlFor}
            className="mb-1 block text-xs font-semibold text-gray-700"
        >
            {children}
            {required ? (
                <span className="text-red-600" aria-hidden="true">
                    {" "}
                    *
                </span>
            ) : null}
        </label>
    );
}

function SectionTitle({ children }: { children: ReactNode }) {
    return (
        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-700">
            {children}
        </h3>
    );
}

/* -------------------------------------------------------------------------- */
/* Props                                                                      */
/* -------------------------------------------------------------------------- */

type AddLocationFormProps = {
    locationId?: string;
    onCancel?: () => void;
    onSaved?: (location: LocationFormData) => void;
};

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

export default function AddLocationForm({
    locationId,
    onCancel,
    onSaved,
}: AddLocationFormProps) {
    const router = useRouter();
    const {
        token,
        organizationId,
        isLoading: isAuthLoading,
        permissions,
    } = useAuth();
    const queryClient = useQueryClient();
    const isEditMode = Boolean(locationId);
    const [isRedirectingInactive, setIsRedirectingInactive] = useState(false);

    const canSave = isEditMode
        ? permissions.has("organisation.update") ||
          permissions.has("organisation.manage")
        : permissions.has("organisation.create") ||
          permissions.has("organisation.manage");

    /* ------------------------------------------------------------------------ */
    /* State                                                                    */
    /* ------------------------------------------------------------------------ */

    const [locationTypes, setLocationTypes] =
        useState<LocationType[]>([]);

    const locationTypesQuery = useQuery({
        queryKey: ["organization", "location-types", organizationId],
        queryFn: () => {
            if (!token || !organizationId) {
                throw new Error("Missing auth context");
            }
            return fetchOrganisationLocationTypesApi(token, organizationId);
        },
        enabled: !!token && !!organizationId && !isAuthLoading,
    });

    const locationDetailQuery = useQuery({
        queryKey: ["organization", "location", organizationId, locationId],
        queryFn: () => {
            if (!token || !organizationId || !locationId) {
                throw new Error("Missing auth context");
            }
            return fetchOrganisationLocationByIdApi(
                token,
                organizationId,
                locationId,
            );
        },
        enabled:
            !!token && !!organizationId && !!locationId && !isAuthLoading,
    });

    useEffect(() => {
        if (!locationTypesQuery.data?.items) return;
        setLocationTypes(
            locationTypesQuery.data.items.map((type) => ({
                id: type.id,
                name: type.name,
                isCustom: type.isCustom,
                isUsed: type.isUsed,
            })),
        );
    }, [locationTypesQuery.data?.items]);

    const [showAddType, setShowAddType] =
        useState(false);

    const [newType, setNewType] =
        useState("");

    const [form, setForm] =
        useState<LocationFormData>({
            name: "",

            type: "",

            address: {
                country: DEFAULT_COUNTRY_CODE,
                line1: "",
                line2: "",
                state: "",
                district: "",
                pincode: "",
            },

            responsiblePerson: {
                id: "",
                name: "",
                phone: "",
                email: "",
            },

            deputy: {
                id: "",
                name: "",
                phone: "",
                email: "",
            },

            officeContact: {
                phone: "",
                email: "",
            },
        });

    const [isSaving, setIsSaving] =
        useState(false);

    const [error, setError] =
        useState("");

    const activeEmployeesQuery = useQuery({
        queryKey: [
            "organization",
            "employees",
            organizationId,
            "active-picker",
        ],
        queryFn: () => {
            if (!token || !organizationId) {
                throw new Error("Missing auth context");
            }
            return fetchOrganisationEmployeesApi(token, {
                organizationId,
                status: "active",
                page: 1,
                pageSize: 200,
            });
        },
        enabled: !!token && !!organizationId && !isAuthLoading,
    });

    const activeEmployees = activeEmployeesQuery.data?.items ?? [];

    useEffect(() => {
        const detail = locationDetailQuery.data;
        if (!detail) return;
        setForm({
            name: detail.name,
            type: detail.type,
            address: {
                country: detail.addressCountry ?? DEFAULT_COUNTRY_CODE,
                line1: detail.addressLine1,
                line2: detail.addressLine2 ?? "",
                state: detail.addressState ?? "",
                district: detail.addressDistrict ?? "",
                pincode: detail.addressPincode ?? "",
            },
            responsiblePerson: contactFromEmployeeSelection(
                detail.responsibleEmployeeId ?? "",
                activeEmployees,
                {
                    name: detail.responsiblePerson ?? "",
                    phone: detail.responsiblePersonPhone ?? "",
                    email: detail.responsiblePersonEmail ?? "",
                },
            ),
            deputy: contactFromEmployeeSelection(
                detail.deputyEmployeeId ?? "",
                activeEmployees,
                {
                    name: detail.deputyName ?? "",
                    phone: detail.deputyPhone ?? "",
                    email: detail.deputyEmail ?? "",
                },
            ),
            officeContact: {
                phone: detail.siteContactPhone ?? "",
                email: detail.siteContactEmail ?? "",
            },
        });
    }, [locationDetailQuery.data, activeEmployees]);

    useEffect(() => {
        const detail = locationDetailQuery.data;
        if (!isEditMode || !detail || !locationId) return;
        if (!detail.isActive || detail.status === "inactive") {
            setIsRedirectingInactive(true);
            router.replace(`/organization/locations/${locationId}`);
        }
    }, [isEditMode, locationDetailQuery.data, locationId, router]);

    const isFormLoading =
        isAuthLoading ||
        locationTypesQuery.isLoading ||
        activeEmployeesQuery.isLoading ||
        (isEditMode &&
            (locationDetailQuery.isLoading ||
                (!locationDetailQuery.data && !locationDetailQuery.isError)));

    const detailLoadFailed = isEditMode && locationDetailQuery.isError;

    const detailLoadErrorMessage =
        locationDetailQuery.error instanceof ApiClientError
            ? locationDetailQuery.error.message
            : "Failed to load location for editing.";

    const responsibleSelectOptions = useMemo(() => {
        const options = [...activeEmployees];
        const currentId = form.responsiblePerson.id;
        if (
            currentId &&
            !options.some((employee) => employee.id === currentId)
        ) {
            options.unshift({
                id: currentId,
                fullName:
                    form.responsiblePerson.name || "Linked employee",
                designation: "",
                department: "",
                location: "",
                reportsToId: null,
                reportsToName: null,
                employmentType: "full_time" as const,
                dateOfJoining: "",
                phone: form.responsiblePerson.phone,
                email: form.responsiblePerson.email,
                status: "active" as const,
            });
        }
        return options;
    }, [activeEmployees, form.responsiblePerson]);

    const deputySelectOptions = useMemo(() => {
        const options = activeEmployees.filter(
            (employee) => employee.id !== form.responsiblePerson.id,
        );
        const currentId = form.deputy.id;
        if (
            currentId &&
            !options.some((employee) => employee.id === currentId)
        ) {
            options.unshift({
                id: currentId,
                fullName: form.deputy.name || "Linked employee",
                designation: "",
                department: "",
                location: "",
                reportsToId: null,
                reportsToName: null,
                employmentType: "full_time" as const,
                dateOfJoining: "",
                phone: form.deputy.phone,
                email: form.deputy.email,
                status: "active" as const,
            });
        }
        return options;
    }, [activeEmployees, form.deputy, form.responsiblePerson.id]);

    const isFormValid = useMemo(
        () => isLocationFormValid(form, locationTypes),
        [form, locationTypes],
    );

    const addressCountryDef = useMemo(
        () => getCountryDefinition(form.address.country),
        [form.address.country],
    );

    const postalRestrictedKind = useMemo(
        () => getPostalRestrictedKindForCountry(form.address.country),
        [form.address.country],
    );

    const officePhonePlaceholder = useMemo(
        () => getPhonePlaceholder(form.address.country),
        [form.address.country],
    );

    const postalFieldPlaceholder = useMemo(
        () => getPostalPlaceholder(form.address.country),
        [form.address.country],
    );

    const canSubmit =
        canSave && isFormValid && !isSaving && !isFormLoading;

    /* ------------------------------------------------------------------------ */
    /* General Form Update                                                      */
    /* ------------------------------------------------------------------------ */

    const updateForm = <
        K extends keyof LocationFormData
    >(
        key: K,
        value: LocationFormData[K]
    ) => {
        setForm((previous) => ({
            ...previous,
            [key]: value,
        }));
    };

    /* ------------------------------------------------------------------------ */
    /* Add Custom Location Type                                                 */
    /* ------------------------------------------------------------------------ */

    const handleAddType = async () => {
        const trimmedType = newType.trim();

        if (!trimmedType || !token || !organizationId) {
            return;
        }

        const alreadyExists = locationTypes.some(
            (type) =>
                type.name.toLowerCase() === trimmedType.toLowerCase(),
        );

        if (alreadyExists) {
            setError("This location type already exists.");
            return;
        }

        try {
            const created = await createOrganisationLocationTypeApi(
                token,
                organizationId,
                trimmedType,
            );
            await queryClient.invalidateQueries({
                queryKey: ["organization", "location-types"],
            });
            updateForm("type", created.name);
            setNewType("");
            setShowAddType(false);
            setError("");
        } catch (saveError) {
            const message =
                saveError instanceof ApiClientError
                    ? saveError.message
                    : "Failed to add location type.";
            setError(message);
        }
    };

    /* ------------------------------------------------------------------------ */
    /* Delete Custom Location Type                                              */
    /* ------------------------------------------------------------------------ */

    const handleDeleteType = async (type: LocationType) => {
        if (!type.isCustom || type.isUsed || !token || !organizationId) {
            return;
        }

        if (form.type === type.name) {
            updateForm("type", "");
        }

        try {
            await deleteOrganisationLocationTypeApi(
                token,
                organizationId,
                type.id,
            );
            await queryClient.invalidateQueries({
                queryKey: ["organization", "location-types"],
            });
        } catch (deleteError) {
            const message =
                deleteError instanceof ApiClientError
                    ? deleteError.message
                    : "Failed to delete location type.";
            setError(message);
        }
    };

    /* ------------------------------------------------------------------------ */
    /* Save Location                                                            */
    /* ------------------------------------------------------------------------ */

    const handleSave = async () => {
        setError("");

        if (!canSubmit) {
            const validationError = locationFormValidationError(
                form,
                locationTypes,
            );
            if (validationError) {
                setError(validationError);
            }
            return;
        }

        const validationError = locationFormValidationError(
            form,
            locationTypes,
        );
        if (validationError) {
            setError(validationError);
            return;
        }

        if (!token || !organizationId) {
            setError("Missing organization context.");
            return;
        }

        const matchedType = locationTypes.find(
            (type) =>
                type.name.toLowerCase() === form.type.toLowerCase(),
        );
        if (!matchedType) {
            setError("Please select a valid location type.");
            return;
        }

        const responsibleId = employeeIdForApi(form.responsiblePerson.id);
        const deputyId = employeeIdForApi(form.deputy.id);
        const officePhone = normalizePhoneForApi(
            form.officeContact.phone,
            addressCountryDef.phoneDefaultCountry,
        );
        const officeEmail = form.officeContact.email.trim();

        const sharedFields = {
            name: form.name.trim(),
            locationTypeId: matchedType.id,
            addressLine1: form.address.line1.trim(),
            addressLine2: form.address.line2.trim() || undefined,
            addressCountry: form.address.country.trim().toUpperCase(),
            addressState: form.address.state.trim(),
            addressDistrict: addressCountryDef.showDistrict
                ? form.address.district.trim()
                : form.address.district.trim() ||
                  form.address.state.trim(),
            addressPincode: form.address.pincode.trim(),
            responsibleEmployeeId: responsibleId,
            deputyEmployeeId: deputyId,
        };

        try {
            setIsSaving(true);

            if (isEditMode && locationId) {
                await updateOrganisationLocationApi(
                    token,
                    organizationId,
                    locationId,
                    {
                        ...sharedFields,
                        siteContactPhone: officePhone || null,
                        siteContactEmail: officeEmail || null,
                    },
                );
                showLocationUpdatedToast(form.name.trim());
            } else {
                await createOrganisationLocationApi(token, {
                    organizationId,
                    ...sharedFields,
                    ...(officePhone
                        ? { siteContactPhone: officePhone }
                        : {}),
                    ...(officeEmail
                        ? { siteContactEmail: officeEmail }
                        : {}),
                });
                showLocationCreatedToast(form.name.trim());
            }

            await queryClient.invalidateQueries({
                queryKey: ["organization", "locations"],
            });

            onSaved?.(form);
        } catch (saveError) {
            const message =
                saveError instanceof ApiClientError
                    ? saveError.message
                    : LOCATION_SAVE_ERROR;
            setError(message);
            showErrorToast(message);
        } finally {
            setIsSaving(false);
        }
    };

    /* ------------------------------------------------------------------------ */
    /* Render                                                                   */
    /* ------------------------------------------------------------------------ */

    const pageTitle = isEditMode ? "Edit location" : "Add location";
    const backHref = isEditMode
        ? `/organization/locations/${locationId}`
        : "/organization/locations";
    const backLabel = isEditMode ? "Back to location" : "Back to locations";

    return (
        <DashboardLayout
            title={pageTitle}
            description={LOCATIONS_PAGE_DESCRIPTION}
            tabs={[...LOCATIONS_DASHBOARD_TABS]}
            activeTab={LOCATIONS_ACTIVE_TAB}
            backHref={backHref}
            backLabel={backLabel}
        >
        <div className="w-full">
            {isRedirectingInactive ? (
                <OrganisationDashboardFormSkeleton
                    fieldRows={6}
                    label="Redirecting to location details"
                />
            ) : isFormLoading ? (
                <OrganisationDashboardFormSkeleton
                    label={
                        isEditMode
                            ? "Loading location for editing"
                            : "Loading location form"
                    }
                />
            ) : detailLoadFailed ? (
                <ErrorState
                    title="Failed to load location"
                    message={detailLoadErrorMessage}
                    onRetry={() => {
                        void locationDetailQuery.refetch();
                    }}
                />
            ) : (
            <div className="rounded-lg border border-gray-200 bg-white p-5">

                <fieldset
                    disabled={isSaving}
                    className="w-full space-y-6 border-0 p-0 m-0"
                >
                {/* ---------------------------------------------------------------- */}
                {/* Location Name                                                     */}
                {/* ---------------------------------------------------------------- */}

                <div>
                    <FieldLabel htmlFor="location-name" required>
                        Location name
                    </FieldLabel>

                    <RestrictedInput
                        id="location-name"
                        restrictedKind="name"
                        maxLength={ORG_INPUT_LIMITS.locationName}
                        value={form.name}
                        onChange={(value) => {
                            updateForm("name", value);
                        }}
                        placeholder="Enter location name"
                        className={INPUT_FIELD_CLASS}
                    />
                </div>

                {/* ---------------------------------------------------------------- */}
                {/* Location Type                                                     */}
                {/* ---------------------------------------------------------------- */}

                <div>
                    <FieldLabel required>Type</FieldLabel>
                    <p className="mb-2 text-xs text-gray-500">
                        Choose a type or add a custom one inline.
                    </p>

                    <div className="flex flex-wrap items-center gap-2">

                        {locationTypes.map((type) => {
                            const selected =
                                form.type === type.name;

                            return (
                                <div
                                    key={type.id}
                                    className="relative"
                                >
                                    <button
                                        type="button"
                                        onClick={() => {
                                            updateForm(
                                                "type",
                                                type.name
                                            );
                                        }}
                                        className={[
                                            "h-9 rounded-md border px-4 text-sm font-semibold transition",
                                            selected
                                                ? TYPE_CHIP_SELECTED_CLASS
                                                : TYPE_CHIP_DEFAULT_CLASS,
                                        ].join(" ")}
                                    >
                                        {type.name}
                                    </button>

                                    {/* Custom type delete button */}

                                    {type.isCustom && (
                                        <button
                                            type="button"
                                            disabled={type.isUsed}
                                            onClick={() => {
                                                handleDeleteType(
                                                    type
                                                );
                                            }}
                                            title={
                                                type.isUsed
                                                    ? "This type is already used by a location"
                                                    : "Delete location type"
                                            }
                                            className={[
                                                "absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full border bg-white shadow-sm",
                                                type.isUsed
                                                    ? "cursor-not-allowed border-gray-200 text-gray-300"
                                                    : "border-gray-300 text-gray-500 hover:border-red-300 hover:text-red-500",
                                            ].join(" ")}
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    )}
                                </div>
                            );
                        })}

                        {/* Add Type */}

                        <button
                            type="button"
                            onClick={() => {
                                setShowAddType(
                                    (previous) =>
                                        !previous
                                );
                            }}
                            className="inline-flex h-9 items-center gap-1 rounded-md border border-dashed border-gray-300 px-3 text-sm font-semibold text-gray-600 transition hover:border-gray-400 hover:bg-gray-50"
                        >
                            <Plus className="h-4 w-4" />
                            Add Type
                        </button>
                    </div>

                    {/* -------------------------------------------------------------- */}
                    {/* Add Type Input                                                  */}
                    {/* -------------------------------------------------------------- */}

                    {showAddType && (
                        <div className="mt-3 flex max-w-md items-center gap-2">

                            <RestrictedInput
                                restrictedKind="text"
                                maxLength={ORG_INPUT_LIMITS.locationTypeName}
                                value={newType}
                                onChange={setNewType}
                                onKeyDown={(event) => {
                                    if (event.key === "Enter") {
                                        handleAddType();
                                    }
                                }}
                                autoFocus
                                placeholder="Enter new location type"
                                className="h-9 flex-1 rounded-md border border-gray-300 px-3 text-sm outline-none focus:border-[#FE5720] focus:ring-1 focus:ring-[#FE5720]/20"
                            />

                            <Button
                                type="button"
                                onClick={handleAddType}
                                className="h-9 px-4"
                            >
                                Add
                            </Button>

                            <button
                                type="button"
                                onClick={() => {
                                    setNewType("");
                                    setShowAddType(false);
                                }}
                                className="flex h-9 w-9 items-center justify-center rounded-md border border-gray-300 text-gray-500 hover:bg-gray-50"
                                title="Cancel"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    )}
                </div>

                {/* ---------------------------------------------------------------- */}
                {/* Address                                                           */}
                {/* ---------------------------------------------------------------- */}

                <div>
                    <SectionTitle>Address</SectionTitle>
                    <p className="mt-1 text-xs text-gray-500">
                        Structured address for this site (line 1 required).
                    </p>

                    <div className="mt-3 space-y-3">
                        <div>
                            <FieldLabel required>Address line 1</FieldLabel>
                            <RestrictedInput
                                restrictedKind="text"
                                maxLength={ORG_INPUT_LIMITS.addressLine}
                                value={form.address.line1}
                                onChange={(line1) => {
                                    setForm((previous) => ({
                                        ...previous,
                                        address: {
                                            ...previous.address,
                                            line1,
                                        },
                                    }));
                                }}
                                placeholder="Street, building, area"
                                className={INPUT_FIELD_CLASS}
                            />
                        </div>

                        <div>
                            <FieldLabel>Address line 2</FieldLabel>
                            <RestrictedInput
                                restrictedKind="text"
                                maxLength={ORG_INPUT_LIMITS.addressLine}
                                value={form.address.line2}
                                onChange={(line2) => {
                                    setForm((previous) => ({
                                        ...previous,
                                        address: {
                                            ...previous.address,
                                            line2,
                                        },
                                    }));
                                }}
                                placeholder="Landmark, locality, apartment, etc."
                                className={INPUT_FIELD_CLASS}
                            />
                        </div>

                        <div>
                            <FieldLabel htmlFor="location-country" required>
                                Country
                            </FieldLabel>
                            <CountrySelect
                                id="location-country"
                                value={form.address.country}
                                onChange={(country: string) => {
                                    setForm((previous) => ({
                                        ...previous,
                                        address: {
                                            ...previous.address,
                                            country,
                                            state: "",
                                            pincode: "",
                                        },
                                    }));
                                }}
                                className={SELECT_FIELD_CLASS}
                            />
                        </div>

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div>
                                <FieldLabel required>
                                    {addressCountryDef.regionLabel}
                                </FieldLabel>
                                <RegionSelect
                                    countryCode={form.address.country}
                                    value={form.address.state}
                                    onChange={(state) => {
                                        setForm((previous) => ({
                                            ...previous,
                                            address: {
                                                ...previous.address,
                                                state,
                                            },
                                        }));
                                    }}
                                    selectClassName={SELECT_FIELD_CLASS}
                                    inputClassName={INPUT_FIELD_CLASS}
                                />
                            </div>
                            {addressCountryDef.showDistrict ? (
                                <div>
                                    <FieldLabel required>District</FieldLabel>
                                    <RestrictedInput
                                        restrictedKind="text"
                                        maxLength={
                                            ORG_INPUT_LIMITS.addressRegion
                                        }
                                        value={form.address.district}
                                        onChange={(district) => {
                                            setForm((previous) => ({
                                                ...previous,
                                                address: {
                                                    ...previous.address,
                                                    district,
                                                },
                                            }));
                                        }}
                                        placeholder="District"
                                        className={INPUT_FIELD_CLASS}
                                    />
                                </div>
                            ) : null}
                        </div>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div>
                                <FieldLabel required>
                                    {addressCountryDef.postalLabel}
                                </FieldLabel>
                                <RestrictedInput
                                    restrictedKind={postalRestrictedKind}
                                    value={form.address.pincode}
                                    onChange={(pincode) => {
                                        setForm((previous) => ({
                                            ...previous,
                                            address: {
                                                ...previous.address,
                                                pincode,
                                            },
                                        }));
                                    }}
                                    placeholder={postalFieldPlaceholder}
                                    className={INPUT_FIELD_CLASS}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* ---------------------------------------------------------------- */}
                {/* Office contact information                                        */}
                {/* ---------------------------------------------------------------- */}

                <div>
                    <SectionTitle>Office contact information</SectionTitle>
                    <p className="mt-1 text-xs text-gray-500">
                        Office or reception phone and email — separate from the
                        responsible person and deputy.
                    </p>

                    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div>
                            <FieldLabel htmlFor="location-office-phone">
                                Mobile number
                            </FieldLabel>
                            <RestrictedInput
                                id="location-office-phone"
                                restrictedKind="phone"
                                phoneDefaultCountry={
                                    addressCountryDef.phoneDefaultCountry
                                }
                                maxLength={ORG_INPUT_LIMITS.phone}
                                value={form.officeContact.phone}
                                onChange={(phone) => {
                                    setForm((previous) => ({
                                        ...previous,
                                        officeContact: {
                                            ...previous.officeContact,
                                            phone,
                                        },
                                    }));
                                }}
                                placeholder={officePhonePlaceholder}
                                className={INPUT_FIELD_CLASS}
                            />
                        </div>
                        <div>
                            <FieldLabel htmlFor="location-office-email">
                                Email
                            </FieldLabel>
                            <RestrictedInput
                                id="location-office-email"
                                restrictedKind="email"
                                value={form.officeContact.email}
                                onChange={(email) => {
                                    setForm((previous) => ({
                                        ...previous,
                                        officeContact: {
                                            ...previous.officeContact,
                                            email,
                                        },
                                    }));
                                }}
                                placeholder="Office or reception email"
                                className={INPUT_FIELD_CLASS}
                            />
                        </div>
                    </div>
                </div>

                {/* ---------------------------------------------------------------- */}
                {/* Responsible Person                                                */}
                {/* ---------------------------------------------------------------- */}

                <div>
                    <SectionTitle>Responsible person (optional)</SectionTitle>
                    <p className="mt-1 text-xs text-gray-500">
                        Choose from the employee register; phone and email come
                        from the employee record.
                    </p>

                    <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-3">
                        <div>
                            <FieldLabel htmlFor="location-responsible-person">
                                Name
                            </FieldLabel>
                            <select
                                id="location-responsible-person"
                                value={form.responsiblePerson.id}
                                onChange={(event) => {
                                    const nextId = event.target.value;
                                    updateForm(
                                        "responsiblePerson",
                                        contactFromEmployeeSelection(
                                            nextId,
                                            responsibleSelectOptions,
                                        ),
                                    );
                                    if (
                                        nextId &&
                                        form.deputy.id === nextId
                                    ) {
                                        updateForm(
                                            "deputy",
                                            contactFromEmployeeSelection(
                                                "",
                                                deputySelectOptions,
                                            ),
                                        );
                                    }
                                }}
                                className={SELECT_FIELD_CLASS}
                            >
                                <option value="">
                                    {activeEmployees.length
                                        ? "Select employee"
                                        : "Add employees in Employee register first"}
                                </option>
                                {responsibleSelectOptions.map((employee) => (
                                    <option
                                        key={employee.id}
                                        value={employee.id}
                                    >
                                        {employee.fullName}
                                        {employee.designation
                                            ? ` — ${employee.designation}`
                                            : ""}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <FieldLabel>Phone</FieldLabel>
                            <input
                                type="text"
                                readOnly
                                tabIndex={-1}
                                value={
                                    formatPhoneDisplay(
                                        form.responsiblePerson.phone,
                                    ) || form.responsiblePerson.phone
                                }
                                aria-label="Responsible person phone"
                                className={READONLY_FIELD_CLASS}
                            />
                        </div>
                        <div>
                            <FieldLabel>Email</FieldLabel>
                            <input
                                type="email"
                                readOnly
                                tabIndex={-1}
                                value={form.responsiblePerson.email}
                                aria-label="Responsible person email"
                                className={READONLY_FIELD_CLASS}
                            />
                        </div>
                    </div>
                </div>

                {/* ---------------------------------------------------------------- */}
                {/* Deputy                                                            */}
                {/* ---------------------------------------------------------------- */}

                <div>
                    <SectionTitle>Deputy (optional)</SectionTitle>
                    <p className="mt-1 text-xs text-gray-500">
                        Alternate contact if the responsible person is
                        unavailable.
                    </p>

                    <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-3">
                        <div>
                            <FieldLabel htmlFor="location-deputy">Name</FieldLabel>
                            <select
                                id="location-deputy"
                                value={form.deputy.id}
                                onChange={(event) => {
                                    updateForm(
                                        "deputy",
                                        contactFromEmployeeSelection(
                                            event.target.value,
                                            deputySelectOptions,
                                        ),
                                    );
                                }}
                                className={SELECT_FIELD_CLASS}
                            >
                                <option value="">
                                    {activeEmployees.length
                                        ? "Select employee"
                                        : "Add employees in Employee register first"}
                                </option>
                                {deputySelectOptions.map((employee) => (
                                    <option
                                        key={employee.id}
                                        value={employee.id}
                                    >
                                        {employee.fullName}
                                        {employee.designation
                                            ? ` — ${employee.designation}`
                                            : ""}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <FieldLabel>Phone</FieldLabel>
                            <input
                                type="text"
                                readOnly
                                tabIndex={-1}
                                value={
                                    formatPhoneDisplay(form.deputy.phone) ||
                                    form.deputy.phone
                                }
                                aria-label="Deputy phone"
                                className={READONLY_FIELD_CLASS}
                            />
                        </div>
                        <div>
                            <FieldLabel>Email</FieldLabel>
                            <input
                                type="email"
                                readOnly
                                tabIndex={-1}
                                value={form.deputy.email}
                                aria-label="Deputy email"
                                className={READONLY_FIELD_CLASS}
                            />
                        </div>
                    </div>
                </div>

                {error ? (
                    <div
                        role="alert"
                        className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600"
                    >
                        {error}
                    </div>
                ) : null}

                <div className="flex gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-xs leading-relaxed text-gray-600 sm:px-5">
                    <Info
                        className="mt-0.5 h-4 w-4 shrink-0 text-gray-500"
                        aria-hidden
                    />
                    <p>
                        Locations aren&apos;t just for warehousing — offices,
                        workshops, retail outlets and more all live in this
                        register. Asset Management and Inventory use these
                        entries when marking where a vehicle or part is kept.
                    </p>
                </div>

                <div className="flex flex-col-reverse gap-2 border-t border-gray-100 pt-5 sm:flex-row sm:justify-end">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="h-10 rounded-md border border-gray-300 bg-white px-5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                    >
                        Cancel
                    </button>

                    <Button
                        type="button"
                        variant="primary"
                        onClick={handleSave}
                        disabled={!canSubmit}
                        loading={isSaving}
                        className="h-10 px-5"
                    >
                        {isSaving ? "Saving..." : "Save location"}
                    </Button>
                </div>
                </fieldset>
            </div>
            )}
        </div>
        </DashboardLayout>
    );
}