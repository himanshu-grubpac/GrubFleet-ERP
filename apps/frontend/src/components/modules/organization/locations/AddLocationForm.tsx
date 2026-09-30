"use client";

import { useEffect, useState } from "react";
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

import {
    Plus,
    X,
    ChevronDown,
} from "lucide-react";

import Button from "@/components/ui/GrubpacButton";

/* -------------------------------------------------------------------------- */
/* Default Location Types                                                    */
/* -------------------------------------------------------------------------- */

const DEFAULT_LOCATION_TYPES: LocationType[] = [
    {
        id: "office",
        name: "Office",
        isCustom: false,
        isUsed: false,
    },
    {
        id: "workshop",
        name: "Workshop",
        isCustom: false,
        isUsed: false,
    },
    {
        id: "warehouse",
        name: "Warehouse",
        isCustom: false,
        isUsed: false,
    },
    {
        id: "retail-outlet",
        name: "Retail Outlet",
        isCustom: false,
        isUsed: false,
    },
];

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type Contact = {
    id: string;
    name: string;
    phone: string;
    email: string;
};

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
/* Mock Contacts                                                              */
/* -------------------------------------------------------------------------- */

const MOCK_CONTACTS: Contact[] = [
    {
        id: "person-001",
        name: "Rohan Kapoor",
        phone: "+91 9876543210",
        email: "rohan@company.com",
    },
    {
        id: "person-002",
        name: "Priya Nair",
        phone: "+91 9876543211",
        email: "priya@company.com",
    },
    {
        id: "person-003",
        name: "Amit Sharma",
        phone: "+91 9876543212",
        email: "amit@company.com",
    },
    {
        id: "person-004",
        name: "Neha Verma",
        phone: "+91 9876543213",
        email: "neha@company.com",
    },
];

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

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
    const {
        token,
        organizationId,
        isLoading: isAuthLoading,
    } = useAuth();

    const queryClient =
        useQueryClient();

    const isEditMode =
        Boolean(locationId);

    /* ---------------------------------------------------------------------- */
    /* Location Types                                                         */
    /* ---------------------------------------------------------------------- */

    const [
        locationTypes,
        setLocationTypes,
    ] = useState<LocationType[]>(
        DEFAULT_LOCATION_TYPES
    );

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
        if (
            !locationTypesQuery.data?.items
        ) {
            return;
        }

        const apiTypes: LocationType[] =
            locationTypesQuery.data.items.map(
                (type) => ({
                    id: type.id,
                    name: type.name,
                    isCustom:
                        type.isCustom,
                    isUsed:
                        type.isUsed,
                })
            );

        /*
         * Keep the API version when the backend
         * already contains a default type.
         * This preserves the real backend ID.
         */
        const missingDefaults =
            DEFAULT_LOCATION_TYPES.filter(
                (defaultType) =>
                    !apiTypes.some(
                        (apiType) =>
                            apiType.name.toLowerCase() ===
                            defaultType.name.toLowerCase()
                    )
            );

        setLocationTypes([
            ...missingDefaults,
            ...apiTypes,
        ]);
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
                    detail.addressLine1,

                line2:
                    detail.addressLine2 ??
                    "",

                city:
                    detail.addressCity ??
                    "",

                state:
                    detail.addressState ??
                    "",

                district:
                    detail.addressDistrict ??
                    "",

                pincode:
                    detail.addressPincode ??
                    "",
            },

            contactInformation: {
                phone:
                    detail.siteContactPhone ??
                    "",

                email:
                    detail.siteContactEmail ??
                    "",
            },

            responsiblePerson: {
                id:
                    detail.responsibleEmployeeId ??
                    "",

                name:
                    detail.responsiblePerson ??
                    "",

                phone: "",

                email: "",
            },

            deputy: {
                id:
                    detail.deputyEmployeeId ??
                    "",

                name:
                    detail.deputyName ??
                    "",

                phone: "",

                email: "",
            },
        });
    }, [
        locationDetailQuery.data,
    ]);

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

    /* ---------------------------------------------------------------------- */
    /* Responsible Person                                                     */
    /* ---------------------------------------------------------------------- */

    const handleResponsiblePersonChange = (
        contactId: string
    ) => {
        if (!contactId) {
            setForm((previous) => ({
                ...previous,

                responsiblePerson: {
                    id: "",
                    name: "",
                    phone: "",
                    email: "",
                },
            }));

            return;
        }

        const contact =
            MOCK_CONTACTS.find(
                (item) =>
                    item.id === contactId
            );

        if (!contact) {
            return;
        }

        setForm((previous) => ({
            ...previous,

            responsiblePerson: {
                id: contact.id,
                name: contact.name,
                phone: contact.phone,
                email: contact.email,
            },
        }));
    };

    /* ---------------------------------------------------------------------- */
    /* Deputy                                                                 */
    /* ---------------------------------------------------------------------- */

    const handleDeputyChange = (
        contactId: string
    ) => {
        if (!contactId) {
            setForm((previous) => ({
                ...previous,

                deputy: {
                    id: "",
                    name: "",
                    phone: "",
                    email: "",
                },
            }));

            return;
        }

        const contact =
            MOCK_CONTACTS.find(
                (item) =>
                    item.id === contactId
            );

        if (!contact) {
            return;
        }

        setForm((previous) => ({
            ...previous,

            deputy: {
                id: contact.id,
                name: contact.name,
                phone: contact.phone,
                email: contact.email,
            },
        }));
    };

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

            await queryClient.invalidateQueries(
                {
                    queryKey: [
                        "organization",
                        "location-types",
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

        /*
         * Clear previous frontend validation errors.
         */
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

        const matchedType =
            locationTypes.find(
                (type) =>
                    type.name.toLowerCase() ===
                    form.type.toLowerCase()
            );

        if (!matchedType) {
            setError(
                "Please select a valid location type."
            );

            return;
        }

        /* ------------------------------------------------------------------ */
        /* API Payload                                                        */
        /* ------------------------------------------------------------------ */

        const payload = {
            organizationId,

            name:
                form.name.trim(),

            locationTypeId:
                matchedType.id,

            addressLine1:
                form.address.line1.trim(),

            addressLine2:
                form.address.line2.trim() ||
                undefined,

            addressCity:
                form.address.city.trim() ||
                undefined,

            addressState:
                form.address.state.trim() ||
                undefined,

            addressDistrict:
                form.address.district.trim() ||
                undefined,

            addressPincode:
                form.address.pincode.trim() ||
                undefined,

            siteContactPhone:
                form.contactInformation.phone.trim() ||
                undefined,

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

            onSaved?.(form);
        } catch (saveError) {
            const message =
                saveError instanceof
                    ApiClientError
                    ? saveError.message
                    : "Failed to save location.";

            setError(message);
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
                            isSaving
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

                <input
                    id="location-name"
                    type="text"
                    value={
                        form.name
                    }
                    onChange={(
                        event
                    ) => {
                        updateForm(
                            "name",
                            event.target
                                .value
                        );

                        setError("");

                        setValidationErrors(
                            (
                                previous
                            ) => {
                                const next =
                                {
                                    ...previous,
                                };

                                delete next.name;

                                return next;
                            }
                        );
                    }}
                    placeholder="Enter location name"
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
                newType={newType}
                error={
                    validationErrors.type
                }
                onSelect={(type: string) => {
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
                        (previous: boolean) =>
                            !previous
                    )
                }

                onNewTypeChange={(value: string) => {
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
            {/* ADDRESS                                                       */}
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
                            const next =
                            {
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

                            return next;
                        }
                    );
                }}
                errors={
                    addressErrors
                }
                collapsible
                defaultExpanded={
                    false
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

                        <input
                            type="tel"
                            value={
                                form
                                    .contactInformation
                                    .phone
                            }
                            onChange={(
                                event
                            ) => {
                                setForm(
                                    (
                                        previous
                                    ) => ({
                                        ...previous,

                                        contactInformation:
                                        {
                                            ...previous.contactInformation,

                                            phone:
                                                event
                                                    .target
                                                    .value,
                                        },
                                    })
                                );
                            }}
                            placeholder="+91 98XXXXXXXX"
                            className="h-10 w-full rounded-md border border-gray-300 px-3 text-sm outline-none placeholder:text-gray-400 focus:border-[#FE5720] focus:ring-1 focus:ring-[#FE5720]/20"
                        />
                    </div>

                    {/* Email */}

                    <div>
                        <label className="mb-1 block text-xs font-semibold text-gray-700">
                            Email
                        </label>

                        <input
                            type="email"
                            value={
                                form
                                    .contactInformation
                                    .email
                            }
                            onChange={(
                                event
                            ) => {
                                setForm(
                                    (
                                        previous
                                    ) => ({
                                        ...previous,

                                        contactInformation:
                                        {
                                            ...previous.contactInformation,

                                            email:
                                                event
                                                    .target
                                                    .value,
                                        },
                                    })
                                );
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

                    {/* Name */}

                    <div>
                        <label className="mb-1 block text-xs font-semibold text-gray-700">
                            Name
                        </label>

                        <div className="relative">
                            <select
                                value={
                                    form
                                        .responsiblePerson
                                        .id
                                }
                                onChange={(
                                    event
                                ) =>
                                    handleResponsiblePersonChange(
                                        event
                                            .target
                                            .value
                                    )
                                }
                                className="h-10 w-full appearance-none rounded-md border border-gray-300 bg-white px-3 pr-10 text-sm text-gray-700 outline-none focus:border-[#FE5720] focus:ring-1 focus:ring-[#FE5720]/20"
                            >
                                <option value="">
                                    Select responsible person
                                </option>

                                {MOCK_CONTACTS.map(
                                    (
                                        contact
                                    ) => (
                                        <option
                                            key={
                                                contact.id
                                            }
                                            value={
                                                contact.id
                                            }
                                        >
                                            {
                                                contact.name
                                            }
                                        </option>
                                    )
                                )}
                            </select>

                            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        </div>
                    </div>

                    {/* Phone */}

                    <div>
                        <label className="mb-1 block text-xs font-semibold text-gray-700">
                            Phone
                        </label>

                        <input
                            type="tel"
                            value={
                                form
                                    .responsiblePerson
                                    .phone
                            }
                            readOnly
                            placeholder="+91 98XXXXXXXX"
                            className="h-10 w-full rounded-md border border-gray-300 bg-gray-50 px-3 text-sm text-gray-600 outline-none"
                        />
                    </div>

                    {/* Email */}

                    <div>
                        <label className="mb-1 block text-xs font-semibold text-gray-700">
                            Email
                        </label>

                        <input
                            type="email"
                            value={
                                form
                                    .responsiblePerson
                                    .email
                            }
                            readOnly
                            placeholder="name@company.com"
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

                    {/* Name */}

                    <div>
                        <label className="mb-1 block text-xs font-semibold text-gray-700">
                            Name
                        </label>

                        <div className="relative">
                            <select
                                value={
                                    form
                                        .deputy
                                        .id
                                }
                                onChange={(
                                    event
                                ) =>
                                    handleDeputyChange(
                                        event
                                            .target
                                            .value
                                    )
                                }
                                className="h-10 w-full appearance-none rounded-md border border-gray-300 bg-white px-3 pr-10 text-sm text-gray-700 outline-none focus:border-[#FE5720] focus:ring-1 focus:ring-[#FE5720]/20"
                            >
                                <option value="">
                                    Select deputy
                                </option>

                                {MOCK_CONTACTS.map(
                                    (
                                        contact
                                    ) => (
                                        <option
                                            key={
                                                contact.id
                                            }
                                            value={
                                                contact.id
                                            }
                                        >
                                            {
                                                contact.name
                                            }
                                        </option>
                                    )
                                )}
                            </select>

                            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        </div>
                    </div>

                    {/* Phone */}

                    <div>
                        <label className="mb-1 block text-xs font-semibold text-gray-700">
                            Phone
                        </label>

                        <input
                            type="tel"
                            value={
                                form
                                    .deputy
                                    .phone
                            }
                            readOnly
                            placeholder="+91 98XXXXXXXX"
                            className="h-10 w-full rounded-md border border-gray-300 bg-gray-50 px-3 text-sm text-gray-600 outline-none"
                        />
                    </div>

                    {/* Email */}

                    <div>
                        <label className="mb-1 block text-xs font-semibold text-gray-700">
                            Email
                        </label>

                        <input
                            type="email"
                            value={
                                form
                                    .deputy
                                    .email
                            }
                            readOnly
                            placeholder="name@company.com"
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