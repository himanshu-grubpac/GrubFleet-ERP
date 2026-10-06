"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/providers/auth-provider";
import { ApiClientError } from "@/lib/api/client";

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
    fetchOrganisationEmployeesApi,
    ORGANISATION_EMPLOYEE_FORM_PICKER_PAGE_SIZE,
    type OrganisationEmployeeListItem,
} from "@/lib/api/organisation/employees";
import {
    formatPhoneDisplay,
    normalizePhoneForApi,
} from "@/lib/format/phone-format";
import type { CountryCode } from "libphonenumber-js";
import {
    LOCATION_SAVE_ERROR,
    showErrorToast,
    showLocationCreatedToast,
    showLocationUpdatedToast,
} from "@/lib/toast/show-toast";
import {
    ORG_INPUT_LIMITS,
    isValidOrgEmail,
} from "@/lib/validation/org-input-constraints";
import {
    DEFAULT_COUNTRY_CODE,
    getCountryDefinition,
} from "@/lib/geo/countries";
import { getPhonePlaceholder } from "@/lib/geo/placeholders";

import OrganizationFormLayout from "@/components/common/OrganizationFormLayout";

import OrganizationAddressForm from "@/components/common/OrganizationAddressForm";

import LocationTypeSelector, {
    type LocationType,
} from "@/components/modules/organization/locations/LocationTypeSelector";

import {
    validateOrganizationAddress,
    hasValidationErrors,
    type OrganizationValidationErrors,
} from "@/components/common/OrganizationValidation";

import { RestrictedInput } from "@/components/ui/RestrictedInput";
import Button from "@/components/ui/GrubpacButton";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type LocationFormData = {
    name: string;

    type: string;

    address: {
        line1: string;
        line2: string;
        city: string;
        state: string;
        district: string;
        pincode: string;
        country: string;
    };

    contactInformation: {
        phone: string;
        email: string;
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
};

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

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

const UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function employeeIdForApi(
    id: string
): string | undefined {
    return id && UUID_RE.test(id)
        ? id
        : undefined;
}

/* -------------------------------------------------------------------------- */
/* Props                                                                      */
/* -------------------------------------------------------------------------- */

type AddLocationFormProps = {
    locationId?: string;

    onCancel?: () => void;

    onSaved?: (
        location: LocationFormData
    ) => void;
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

    const queryClient =
        useQueryClient();

    const isEditMode =
        Boolean(locationId);

    const canCreate =
        permissions.has("organisation.create") ||
        permissions.has("organisation.manage");

    const canUpdate =
        permissions.has("organisation.update") ||
        permissions.has("organisation.manage");

    const canSave = isEditMode ? canUpdate : canCreate;

    /* ---------------------------------------------------------------------- */
    /* Location Types                                                         */
    /* ---------------------------------------------------------------------- */

    const [
        locationTypes,
        setLocationTypes,
    ] = useState<LocationType[]>([]);

    const locationTypesQuery = useQuery({
        queryKey: [
            "organization",
            "location-types",
            organizationId,
        ],

        queryFn: () => {
            if (
                !token ||
                !organizationId
            ) {
                throw new Error(
                    "Missing auth context"
                );
            }

            return fetchOrganisationLocationTypesApi(
                token,
                organizationId
            );
        },

        enabled:
            !!token &&
            !!organizationId &&
            !isAuthLoading,
    });

    /* ---------------------------------------------------------------------- */
    /* Location Details - Edit                                               */
    /* ---------------------------------------------------------------------- */

    const locationDetailQuery = useQuery({
        queryKey: [
            "organization",
            "location",
            organizationId,
            locationId,
        ],

        queryFn: () => {
            if (
                !token ||
                !organizationId ||
                !locationId
            ) {
                throw new Error(
                    "Missing auth context"
                );
            }

            return fetchOrganisationLocationByIdApi(
                token,
                organizationId,
                locationId
            );
        },

        enabled:
            !!token &&
            !!organizationId &&
            !!locationId &&
            !isAuthLoading,
    });

    useEffect(() => {
        const detail = locationDetailQuery.data;
        if (!detail || !isEditMode || !locationId) {
            return;
        }
        if (!detail.isActive || detail.status === "inactive") {
            router.replace(`/organization/locations/${locationId}`);
        }
    }, [
        isEditMode,
        locationDetailQuery.data,
        locationId,
        router,
    ]);

    /* ---------------------------------------------------------------------- */
    /* Active employees (responsible / deputy selects)                        */
    /* ---------------------------------------------------------------------- */

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
                pageSize: ORGANISATION_EMPLOYEE_FORM_PICKER_PAGE_SIZE,
            });
        },
        enabled: !!token && !!organizationId && !isAuthLoading,
    });

    const activeEmployees = useMemo(
        () => activeEmployeesQuery.data?.items ?? [],
        [activeEmployeesQuery.data?.items],
    );

    /* ---------------------------------------------------------------------- */
    /* Populate Location Types                                                */
    /* ---------------------------------------------------------------------- */

    useEffect(() => {
        if (
            !locationTypesQuery.data?.items
        ) {
            return;
        }

        setLocationTypes(
            locationTypesQuery.data.items.map((type) => ({
                id: type.id,
                name: type.name,
                isCustom: type.isCustom,
                isUsed: type.isUsed,
            })),
        );
    }, [
        locationTypesQuery.data?.items,
    ]);

    /* ---------------------------------------------------------------------- */
    /* Add Type State                                                         */
    /* ---------------------------------------------------------------------- */

    const [
        showAddType,
        setShowAddType,
    ] = useState(false);

    const [
        newType,
        setNewType,
    ] = useState("");

    /* ---------------------------------------------------------------------- */
    /* Form State                                                             */
    /* ---------------------------------------------------------------------- */

    const [form, setForm] =
        useState<LocationFormData>({
            name: "",

            type: "",

            address: {
                line1: "",
                line2: "",
                city: "",
                state: "",
                district: "",
                pincode: "",
                country: DEFAULT_COUNTRY_CODE,
            },

            contactInformation: {
                phone: "",
                email: "",
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
        });

    /* ---------------------------------------------------------------------- */
    /* Save / Error State                                                     */
    /* ---------------------------------------------------------------------- */

    const [isSaving, setIsSaving] =
        useState(false);

    const [error, setError] =
        useState("");

    const [
        validationErrors,
        setValidationErrors,
    ] =
        useState<OrganizationValidationErrors>(
            {}
        );

    /* ---------------------------------------------------------------------- */
    /* Populate Edit Data                                                     */
    /* ---------------------------------------------------------------------- */

    useEffect(() => {
        const detail =
            locationDetailQuery.data;

        if (!detail) {
            return;
        }

        setForm({
            name: detail.name,

            type: detail.type,

            address: {
                line1:
                    detail.addressLine1 ?? "",

                line2:
                    detail.addressLine2 ?? "",

                city:
                    detail.addressCity ?? "",

                state:
                    detail.addressState ?? "",

                district:
                    detail.addressDistrict ?? "",

                pincode:
                    detail.addressPincode ?? "",

                country:
                    detail.addressCountry?.trim() ||
                    DEFAULT_COUNTRY_CODE,
            },

            contactInformation: {
                phone: formatPhoneDisplay(
                    detail.siteContactPhone ?? "",
                    getCountryDefinition(
                        detail.addressCountry ?? DEFAULT_COUNTRY_CODE,
                    ).phoneDefaultCountry,
                ),

                email:
                    detail.siteContactEmail ??
                    "",
            },

            responsiblePerson: contactFromEmployeeSelection(
                detail.responsibleEmployeeId ?? "",
                activeEmployees,
                {
                    name: detail.responsiblePerson ?? "",
                    phone: formatPhoneDisplay(
                        detail.responsiblePersonPhone ?? "",
                    ),
                    email: detail.responsiblePersonEmail ?? "",
                },
            ),

            deputy: contactFromEmployeeSelection(
                detail.deputyEmployeeId ?? "",
                activeEmployees,
                {
                    name: detail.deputyName ?? "",
                    phone: formatPhoneDisplay(detail.deputyPhone ?? ""),
                    email: detail.deputyEmail ?? "",
                },
            ),
        });
    }, [locationDetailQuery.data, activeEmployees]);

    /* ---------------------------------------------------------------------- */
    /* General Form Update                                                    */
    /* ---------------------------------------------------------------------- */

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

    const sitePhonePlaceholder = useMemo(
        () => getPhonePlaceholder(form.address.country),
        [form.address.country],
    );

    const sitePhoneDefaultCountry = useMemo(
        () => getCountryDefinition(form.address.country).phoneDefaultCountry,
        [form.address.country],
    );

    const matchedLocationType = useMemo(() => {
        const trimmedType = form.type.trim();
        if (!trimmedType || !locationTypesQuery.isSuccess) {
            return null;
        }
        const match = locationTypes.find(
            (type) =>
                type.name.toLowerCase() === trimmedType.toLowerCase(),
        );
        if (!match || !UUID_RE.test(match.id)) {
            return null;
        }
        return match;
    }, [
        form.type,
        locationTypes,
        locationTypesQuery.isSuccess,
    ]);

    const canSubmit = useMemo(() => {
        if (!canSave || isSaving || isAuthLoading) {
            return false;
        }
        if (
            locationTypesQuery.isLoading ||
            locationTypesQuery.isError ||
            !locationTypesQuery.isSuccess ||
            activeEmployeesQuery.isLoading
        ) {
            return false;
        }
        if (
            isEditMode &&
            (locationDetailQuery.isLoading ||
                locationDetailQuery.isError ||
                !locationDetailQuery.data?.isActive)
        ) {
            return false;
        }
        if (!form.name.trim() || !matchedLocationType) {
            return false;
        }
        if (
            form.name.trim().length > ORG_INPUT_LIMITS.locationName ||
            !isValidOrgEmail(form.contactInformation.email)
        ) {
            return false;
        }
        const addressErrors = validateOrganizationAddress(form.address);
        return !hasValidationErrors(addressErrors);
    }, [
        canSave,
        isSaving,
        isAuthLoading,
        locationTypesQuery.isLoading,
        locationTypesQuery.isError,
        locationTypesQuery.isSuccess,
        activeEmployeesQuery.isLoading,
        isEditMode,
        locationDetailQuery.isLoading,
        locationDetailQuery.isError,
        locationDetailQuery.data?.isActive,
        form.name,
        form.contactInformation.email,
        matchedLocationType,
        form.address,
    ]);

    /* ---------------------------------------------------------------------- */
    /* Add Custom Location Type                                               */
    /* ---------------------------------------------------------------------- */

    const handleAddType = async () => {
        const trimmedType =
            newType.trim();

        if (
            !trimmedType ||
            !token ||
            !organizationId
        ) {
            return;
        }

        const alreadyExists =
            locationTypes.some(
                (type) =>
                    type.name.toLowerCase() ===
                    trimmedType.toLowerCase()
            );

        if (alreadyExists) {
            setError(
                "This location type already exists."
            );

            return;
        }

        try {
            const created =
                await createOrganisationLocationTypeApi(
                    token,
                    organizationId,
                    trimmedType
                );

            setLocationTypes((previous) => {
                if (previous.some((row) => row.id === created.id)) {
                    return previous;
                }
                return [
                    ...previous,
                    {
                        id: created.id,
                        name: created.name,
                        isCustom: true,
                        isUsed: false,
                    },
                ];
            });

            await queryClient.invalidateQueries(
                {
                    queryKey: [
                        "organization",
                        "location-types",
                        organizationId,
                    ],
                }
            );

            updateForm(
                "type",
                created.name
            );

            setNewType("");

            setShowAddType(false);

            setError("");
        } catch (saveError) {
            const message =
                saveError instanceof
                    ApiClientError
                    ? saveError.message
                    : "Failed to add location type.";

            setError(message);
        }
    };

    /* ---------------------------------------------------------------------- */
    /* Delete Custom Location Type                                            */
    /* ---------------------------------------------------------------------- */

    const handleDeleteType = async (
        type: LocationType
    ) => {
        if (
            !type.isCustom ||
            type.isUsed ||
            !token ||
            !organizationId
        ) {
            return;
        }

        if (
            form.type === type.name
        ) {
            updateForm(
                "type",
                ""
            );
        }

        try {
            await deleteOrganisationLocationTypeApi(
                token,
                organizationId,
                type.id
            );

            await queryClient.invalidateQueries(
                {
                    queryKey: [
                        "organization",
                        "location-types",
                        organizationId,
                    ],
                }
            );
        } catch (deleteError) {
            const message =
                deleteError instanceof
                    ApiClientError
                    ? deleteError.message
                    : "Failed to delete location type.";

            setError(message);
        }
    };

    /* ---------------------------------------------------------------------- */
    /* Save Location                                                           */
    /* ---------------------------------------------------------------------- */

    const handleSave = async () => {
        setError("");

        setValidationErrors({});

        const errors: OrganizationValidationErrors =
            {};

        /* ------------------------------------------------------------------ */
        /* Location Name                                                      */
        /* ------------------------------------------------------------------ */

        if (!form.name.trim()) {
            errors.name =
                "Location name is required.";
        }

        /* ------------------------------------------------------------------ */
        /* Location Type                                                      */
        /* ------------------------------------------------------------------ */

        if (!form.type.trim()) {
            errors.type =
                "Please select a location type.";
        }

        /* ------------------------------------------------------------------ */
        /* Address                                                            */
        /* ------------------------------------------------------------------ */

        const addressErrors =
            validateOrganizationAddress(
                form.address
            );

        Object.entries(
            addressErrors
        ).forEach(
            ([field, message]) => {
                errors[
                    `address.${field}`
                ] = message;
            }
        );

        /* ------------------------------------------------------------------ */
        /* Set Validation Errors                                               */
        /* ------------------------------------------------------------------ */

        setValidationErrors(
            errors
        );

        /* ------------------------------------------------------------------ */
        /* Stop if Frontend Validation Failed                                  */
        /* ------------------------------------------------------------------ */

        if (
            hasValidationErrors(
                errors
            )
        ) {
            return;
        }

        /* ------------------------------------------------------------------ */
        /* Auth Context                                                        */
        /* ------------------------------------------------------------------ */

        if (
            !token ||
            !organizationId
        ) {
            setError(
                "Missing organization context."
            );

            return;
        }

        /* ------------------------------------------------------------------ */
        /* Location Type                                                      */
        /* ------------------------------------------------------------------ */

        if (!matchedLocationType) {
            setError(
                "Please select a valid location type."
            );

            return;
        }

        const addressCountryCode = (form.address.country.trim().toUpperCase() ||
            "IN") as CountryCode;

        const sitePhoneRaw =
            form.contactInformation.phone.trim();
        const siteContactPhoneNormalized = sitePhoneRaw
            ? normalizePhoneForApi(sitePhoneRaw, addressCountryCode)
            : undefined;

        /* ------------------------------------------------------------------ */
        /* API Payload                                                        */
        /* ------------------------------------------------------------------ */

        const payload = {
            organizationId,

            name:
                form.name.trim(),

            locationTypeId:
                matchedLocationType.id,

            addressLine1:
                form.address.line1.trim(),

            addressLine2:
                form.address.line2.trim() ||
                undefined,

            addressCity:
                form.address.city.trim() ||
                undefined,

            addressState: form.address.state.trim(),

            addressDistrict: form.address.district.trim(),

            addressPincode: form.address.pincode.trim(),

            addressCountry:
                form.address.country.trim() || "IN",

            siteContactPhone: siteContactPhoneNormalized,

            siteContactEmail:
                form.contactInformation.email.trim() ||
                undefined,

            responsibleEmployeeId:
                employeeIdForApi(
                    form.responsiblePerson.id
                ),

            deputyEmployeeId:
                employeeIdForApi(
                    form.deputy.id
                ),
        };

        /* ------------------------------------------------------------------ */
        /* Save                                                                */
        /* ------------------------------------------------------------------ */

        try {
            setIsSaving(true);

            if (
                isEditMode &&
                locationId
            ) {
                await updateOrganisationLocationApi(
                    token,
                    organizationId,
                    locationId,
                    payload
                );
            } else {
                await createOrganisationLocationApi(
                    token,
                    payload
                );
            }

            await queryClient.invalidateQueries(
                {
                    queryKey: [
                        "organization",
                        "locations",
                    ],
                }
            );

            if (isEditMode) {
                showLocationUpdatedToast(form.name.trim());
            } else {
                showLocationCreatedToast(form.name.trim());
            }

            onSaved?.(form);
        } catch (saveError) {
            const message =
                saveError instanceof
                    ApiClientError
                    ? saveError.message
                    : LOCATION_SAVE_ERROR;

            setError(message);
            showErrorToast(message);
        } finally {
            setIsSaving(false);
        }
    };

    /* ---------------------------------------------------------------------- */
    /* Address Error Mapping                                                  */
    /* ---------------------------------------------------------------------- */

    const addressErrors = {
        line1:
            validationErrors[
            "address.line1"
            ],

        line2:
            validationErrors[
            "address.line2"
            ],

        city:
            validationErrors[
            "address.city"
            ],

        state:
            validationErrors[
            "address.state"
            ],

        district:
            validationErrors[
            "address.district"
            ],

        pincode:
            validationErrors[
            "address.pincode"
            ],

        country:
            validationErrors[
            "address.country"
            ],
    };

    /* ---------------------------------------------------------------------- */
    /* UI                                                                      */
    /* ---------------------------------------------------------------------- */

    return (
        <OrganizationFormLayout
            title={
                isEditMode
                    ? "Edit Location"
                    : "Add Location"
            }
            description={
                isEditMode
                    ? "Update the location details, address, contacts, and responsible people."
                    : "Register an office, workshop, warehouse, retail outlet, or other organization location."
            }
            infoText="Locations aren't just for warehousing — Offices, Workshops, Retail Outlets and more all live in this same register, and are what Asset Management and Inventory select from when marking a vehicle's or part's location."
            actions={
                <>
                    {/* Cancel */}

                    <button
                        type="button"
                        onClick={
                            onCancel
                        }
                        className="h-10 rounded-md border border-gray-300 bg-white px-5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                    >
                        Cancel
                    </button>

                    {/* Save */}

                    <Button
                        type="button"
                        onClick={
                            handleSave
                        }
                        disabled={
                            !canSubmit
                        }
                        className="h-10 px-5"
                    >
                        {isSaving
                            ? "Saving..."
                            : isEditMode
                                ? "Save changes"
                                : "Save location"}
                    </Button>
                </>
            }
        >
            {/* ============================================================ */}
            {/* LOCATION NAME                                                */}
            {/* ============================================================ */}

            <div>
                <label
                    htmlFor="location-name"
                    className="mb-1 block text-xs font-semibold text-gray-700"
                >
                    Location name

                    <span className="ml-1 text-red-500">
                        *
                    </span>
                </label>

                <RestrictedInput
                    id="location-name"
                    restrictedKind="name"
                    maxLength={ORG_INPUT_LIMITS.locationName}
                    value={form.name}
                    onChange={(name) => {
                        updateForm("name", name);
                        setError("");
                        setValidationErrors((previous) => {
                            const next = { ...previous };
                            delete next.name;
                            return next;
                        });
                    }}
                    placeholder="Enter location name"
                    aria-invalid={Boolean(validationErrors.name)}
                    className={[
                        "h-10 w-full rounded-md border bg-white px-3 text-sm text-gray-900 outline-none transition",
                        validationErrors.name
                            ? "border-red-400 focus:border-red-500 focus:ring-1 focus:ring-red-500/20"
                            : "border-gray-300 focus:border-[#FE5720] focus:ring-1 focus:ring-[#FE5720]/20",
                    ].join(" ")}
                />

                {validationErrors.name && (
                    <p className="mt-1 text-xs text-red-500">
                        {
                            validationErrors.name
                        }
                    </p>
                )}
            </div>

            {/* ============================================================ */}
            {/* LOCATION TYPE                                                */}
            {/* ============================================================ */}

            <LocationTypeSelector
                locationTypes={
                    locationTypes
                }
                selectedType={
                    form.type
                }
                showAddType={
                    showAddType
                }
                newType={
                    newType
                }
                error={
                    validationErrors.type
                }
                onSelect={(
                    type: string
                ) => {
                    updateForm(
                        "type",
                        type
                    );

                    setError("");

                    setValidationErrors(
                        (previous) => {
                            const next = {
                                ...previous,
                            };

                            delete next.type;

                            return next;
                        }
                    );
                }}
                onToggleAddType={() =>
                    setShowAddType(
                        (
                            previous: boolean
                        ) =>
                            !previous
                    )
                }
                onNewTypeChange={(
                    value: string
                ) => {
                    setNewType(value);
                    setError("");
                }}
                onAddType={
                    handleAddType
                }
                onDeleteType={
                    handleDeleteType
                }
            />

            {/* ============================================================ */}
            {/* ADDRESS                                                      */}
            {/* ============================================================ */}

            <OrganizationAddressForm
                value={
                    form.address
                }
                onChange={(
                    address
                ) => {
                    updateForm(
                        "address",
                        address
                    );

                    setValidationErrors(
                        (
                            previous
                        ) => {
                            const next = {
                                ...previous,
                            };

                            delete next[
                                "address.line1"
                            ];

                            delete next[
                                "address.line2"
                            ];

                            delete next[
                                "address.city"
                            ];

                            delete next[
                                "address.state"
                            ];

                            delete next[
                                "address.district"
                            ];

                            delete next[
                                "address.pincode"
                            ];

                            delete next[
                                "address.country"
                            ];

                            return next;
                        }
                    );
                }}
                errors={
                    addressErrors
                }
                required
            />

            {/* ============================================================ */}
            {/* CONTACT INFORMATION                                          */}
            {/* ============================================================ */}

            <div className="mt-5 border-t border-gray-100 pt-4">
                <h3 className="text-xs font-semibold text-gray-700">
                    CONTACT INFORMATION
                </h3>

                <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {/* Phone */}

                    <div>
                        <label className="mb-1 block text-xs font-semibold text-gray-700">
                            Phone
                        </label>

                        <RestrictedInput
                            restrictedKind="phone"
                            maxLength={ORG_INPUT_LIMITS.phone}
                            phoneDefaultCountry={sitePhoneDefaultCountry}
                            value={form.contactInformation.phone}
                            onChange={(phone) => {
                                setForm((previous) => ({
                                    ...previous,
                                    contactInformation: {
                                        ...previous.contactInformation,
                                        phone,
                                    },
                                }));
                            }}
                            placeholder={sitePhonePlaceholder}
                            className="h-10 w-full rounded-md border border-gray-300 px-3 text-sm outline-none placeholder:text-gray-400 focus:border-[#FE5720] focus:ring-1 focus:ring-[#FE5720]/20"
                        />
                    </div>

                    {/* Email */}

                    <div>
                        <label className="mb-1 block text-xs font-semibold text-gray-700">
                            Email
                        </label>

                        <RestrictedInput
                            restrictedKind="email"
                            maxLength={ORG_INPUT_LIMITS.email}
                            value={form.contactInformation.email}
                            onChange={(email) => {
                                setForm((previous) => ({
                                    ...previous,
                                    contactInformation: {
                                        ...previous.contactInformation,
                                        email,
                                    },
                                }));
                            }}
                            placeholder="name@company.com"
                            className="h-10 w-full rounded-md border border-gray-300 px-3 text-sm outline-none placeholder:text-gray-400 focus:border-[#FE5720] focus:ring-1 focus:ring-[#FE5720]/20"
                        />
                    </div>
                </div>
            </div>

            {/* ============================================================ */}
            {/* RESPONSIBLE PERSON                                           */}
            {/* ============================================================ */}

            <div className="mt-6">
                <h3 className="text-xs font-semibold text-gray-700">
                    RESPONSIBLE PERSON (OPTIONAL)
                </h3>

                <p className="mt-0.5 text-xs text-gray-500">
                    Select the person responsible for this
                    location&apos;s day-to-day operations.
                </p>

                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <div className="sm:col-span-2 lg:col-span-1">
                        <label
                            htmlFor="location-responsible-person"
                            className="mb-1 block text-xs font-semibold text-gray-700"
                        >
                            Name
                        </label>
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
                                if (nextId && form.deputy.id === nextId) {
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
                        <label className="mb-1 block text-xs font-semibold text-gray-700">
                            Phone
                        </label>
                        <input
                            type="tel"
                            value={formatPhoneDisplay(
                                form.responsiblePerson.phone,
                            )}
                            readOnly
                            tabIndex={-1}
                            placeholder="—"
                            className="h-10 w-full rounded-md border border-gray-300 bg-gray-50 px-3 text-sm text-gray-600 outline-none"
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-xs font-semibold text-gray-700">
                            Email
                        </label>
                        <input
                            type="email"
                            value={form.responsiblePerson.email}
                            readOnly
                            tabIndex={-1}
                            placeholder="—"
                            className="h-10 w-full rounded-md border border-gray-300 bg-gray-50 px-3 text-sm text-gray-600 outline-none"
                        />
                    </div>
                </div>
            </div>

            {/* ============================================================ */}
            {/* DEPUTY                                                         */}
            {/* ============================================================ */}

            <div className="mt-6">
                <h3 className="text-xs font-semibold text-gray-700">
                    DEPUTY (OPTIONAL)
                </h3>

                <p className="mt-0.5 text-xs text-gray-500">
                    Alternate contact if the responsible
                    person is unavailable.
                </p>

                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <div className="sm:col-span-2 lg:col-span-1">
                        <label
                            htmlFor="location-deputy"
                            className="mb-1 block text-xs font-semibold text-gray-700"
                        >
                            Name
                        </label>
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
                        <label className="mb-1 block text-xs font-semibold text-gray-700">
                            Phone
                        </label>
                        <input
                            type="tel"
                            value={formatPhoneDisplay(form.deputy.phone)}
                            readOnly
                            tabIndex={-1}
                            placeholder="—"
                            className="h-10 w-full rounded-md border border-gray-300 bg-gray-50 px-3 text-sm text-gray-600 outline-none"
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-xs font-semibold text-gray-700">
                            Email
                        </label>
                        <input
                            type="email"
                            value={form.deputy.email}
                            readOnly
                            tabIndex={-1}
                            placeholder="—"
                            className="h-10 w-full rounded-md border border-gray-300 bg-gray-50 px-3 text-sm text-gray-600 outline-none"
                        />
                    </div>
                </div>
            </div>

            {/* ============================================================ */}
            {/* API / GENERAL ERROR                                           */}
            {/* ============================================================ */}

            {error && (
                <div className="mt-5 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                    {error}
                </div>
            )}
        </OrganizationFormLayout>
    );
}