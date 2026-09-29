"use client";

import { useState } from "react";
import {
    Plus,
    X,
    Info,
    ChevronDown,
} from "lucide-react";

import Button from "@/components/ui/GrubpacButton";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type LocationType = {
    id: string;
    name: string;
    isCustom: boolean;
    isUsed: boolean;
};

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
/* Mock Location Types                                                        */
/* -------------------------------------------------------------------------- */
/*
 * TEMPORARY MOCK DATA
 *
 * This will later come from the backend.
 */

const INITIAL_LOCATION_TYPES: LocationType[] = [
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
    {
        id: "other",
        name: "Other",
        isCustom: false,
        isUsed: false,
    },
];

/* -------------------------------------------------------------------------- */
/* Mock Contacts                                                              */
/* -------------------------------------------------------------------------- */
/*
 * TEMPORARY MOCK DATA
 *
 * Later this list will come from the backend.
 *
 * When a person is selected:
 * - Name is selected from dropdown
 * - Phone is automatically populated
 * - Email is automatically populated
 */

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
/* Props                                                                      */
/* -------------------------------------------------------------------------- */

type AddLocationFormProps = {
    onCancel?: () => void;
    onSaved?: (location: LocationFormData) => void;
};

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

export default function AddLocationForm({
    onCancel,
    onSaved,
}: AddLocationFormProps) {
    /* ------------------------------------------------------------------------ */
    /* State                                                                    */
    /* ------------------------------------------------------------------------ */

    const [locationTypes, setLocationTypes] =
        useState<LocationType[]>(
            INITIAL_LOCATION_TYPES
        );

    const [showAddType, setShowAddType] =
        useState(false);

    const [newType, setNewType] =
        useState("");

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

    const [isSaving, setIsSaving] =
        useState(false);

    const [error, setError] =
        useState("");

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
    /* Responsible Person                                                       */
    /* ------------------------------------------------------------------------ */

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

        const contact = MOCK_CONTACTS.find(
            (item) => item.id === contactId
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

    /* ------------------------------------------------------------------------ */
    /* Deputy                                                                   */
    /* ------------------------------------------------------------------------ */

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

        const contact = MOCK_CONTACTS.find(
            (item) => item.id === contactId
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

    /* ------------------------------------------------------------------------ */
    /* Add Custom Location Type                                                 */
    /* ------------------------------------------------------------------------ */

    const handleAddType = () => {
        const trimmedType =
            newType.trim();

        if (!trimmedType) {
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

        const customType: LocationType = {
            id: `custom-${Date.now()}`,
            name: trimmedType,
            isCustom: true,
            isUsed: false,
        };

        setLocationTypes((previous) => [
            ...previous,
            customType,
        ]);

        updateForm(
            "type",
            trimmedType
        );

        setNewType("");
        setShowAddType(false);
        setError("");
    };

    /* ------------------------------------------------------------------------ */
    /* Delete Custom Location Type                                              */
    /* ------------------------------------------------------------------------ */

    const handleDeleteType = (
        type: LocationType
    ) => {
        /*
         * Only custom types can be deleted.
         */

        if (!type.isCustom) {
            return;
        }

        /*
         * A type already used by a location
         * cannot be deleted.
         */

        if (type.isUsed) {
            return;
        }

        /*
         * Clear selected type if it is
         * currently selected.
         */

        if (form.type === type.name) {
            updateForm("type", "");
        }

        setLocationTypes((previous) =>
            previous.filter(
                (item) =>
                    item.id !== type.id
            )
        );
    };

    /* ------------------------------------------------------------------------ */
    /* Save Location                                                            */
    /* ------------------------------------------------------------------------ */

    const handleSave = async () => {
        setError("");

        /* Required: Location Name */

        if (!form.name.trim()) {
            setError(
                "Location name is required."
            );

            return;
        }

        /* Required: Location Type */

        if (!form.type) {
            setError(
                "Please select a location type."
            );

            return;
        }

        /* Required: Address Line 1 */

        if (!form.address.line1.trim()) {
            setError(
                "Address Line 1 is required."
            );

            return;
        }

        /* Required: City */

        if (!form.address.city.trim()) {
            setError(
                "City is required."
            );

            return;
        }

        /* Required: State */

        if (!form.address.state.trim()) {
            setError(
                "State is required."
            );

            return;
        }

        /* Required: District */

        if (!form.address.district.trim()) {
            setError(
                "District is required."
            );

            return;
        }

        /* Required: Pincode */

        if (!form.address.pincode.trim()) {
            setError(
                "Pincode is required."
            );

            return;
        }

        /*
         * Pincode validation
         */

        if (
            form.address.pincode.length !== 6
        ) {
            setError(
                "Pincode must contain 6 digits."
            );

            return;
        }

        /*
         * TEMPORARY MOCK SAVE
         *
         * Backend API will be connected later.
         */

        try {
            setIsSaving(true);

            await new Promise((resolve) =>
                setTimeout(resolve, 500)
            );

            console.log(
                "Mock location saved:",
                form
            );

            onSaved?.(form);
        } catch (saveError) {
            console.error(
                "Failed to save location:",
                saveError
            );

            setError(
                "Failed to save location."
            );
        } finally {
            setIsSaving(false);
        }
    };

    /* ------------------------------------------------------------------------ */
    /* Render                                                                   */
    /* ------------------------------------------------------------------------ */

    return (
        <div className="mx-auto w-full max-w-3xl">
            {/* ================================================================== */}
            {/* FORM CARD                                                          */}
            {/* ================================================================== */}

            <div className="rounded-lg border border-gray-200 bg-white p-5">

                {/* ---------------------------------------------------------------- */}
                {/* Location Name                                                     */}
                {/* ---------------------------------------------------------------- */}

                <div>
                    <label
                        htmlFor="location-name"
                        className="mb-1 block text-xs font-semibold text-gray-700"
                    >
                        Location name
                    </label>

                    <input
                        id="location-name"
                        type="text"
                        value={form.name}
                        onChange={(event) => {
                            updateForm(
                                "name",
                                event.target.value
                            );
                        }}
                        placeholder="Enter location name"
                        className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none transition focus:border-[#FE5720] focus:ring-1 focus:ring-[#FE5720]/20"
                    />
                </div>

                {/* ---------------------------------------------------------------- */}
                {/* Location Type                                                     */}
                {/* ---------------------------------------------------------------- */}

                <div className="mt-4">
                    <label className="mb-2 block text-xs font-semibold text-gray-700">
                        TYPE
                    </label>

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
                                                ? "border-blue-600 bg-blue-50 text-blue-700"
                                                : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50",
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

                            <input
                                type="text"
                                value={newType}
                                onChange={(event) => {
                                    setNewType(
                                        event.target.value
                                    );
                                }}
                                onKeyDown={(event) => {
                                    if (
                                        event.key ===
                                        "Enter"
                                    ) {
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

                <div className="mt-5">

                    <h3 className="text-xs font-semibold text-gray-700">
                        ADDRESS
                    </h3>

                    <div className="mt-2 space-y-3">

                        {/* Address Line 1 */}

                        <div>
                            <label className="mb-1 block text-xs font-semibold text-gray-700">
                                Address Line 1
                            </label>

                            <input
                                type="text"
                                value={
                                    form.address.line1
                                }
                                onChange={(event) => {
                                    setForm((previous) => ({
                                        ...previous,

                                        address: {
                                            ...previous.address,
                                            line1:
                                                event.target.value,
                                        },
                                    }));
                                }}
                                placeholder="Street, building, area"
                                className="h-10 w-full rounded-md border border-gray-300 px-3 text-sm outline-none placeholder:text-gray-400 focus:border-[#FE5720] focus:ring-1 focus:ring-[#FE5720]/20"
                            />
                        </div>

                        {/* Address Line 2 */}

                        <div>
                            <label className="mb-1 block text-xs font-semibold text-gray-700">
                                Address Line 2
                            </label>

                            <input
                                type="text"
                                value={
                                    form.address.line2
                                }
                                onChange={(event) => {
                                    setForm((previous) => ({
                                        ...previous,

                                        address: {
                                            ...previous.address,
                                            line2:
                                                event.target.value,
                                        },
                                    }));
                                }}
                                placeholder="Landmark, locality, apartment, etc."
                                className="h-10 w-full rounded-md border border-gray-300 px-3 text-sm outline-none placeholder:text-gray-400 focus:border-[#FE5720] focus:ring-1 focus:ring-[#FE5720]/20"
                            />
                        </div>

                        {/* City + State */}

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">

                            {/* City */}

                            <div>
                                <label className="mb-1 block text-xs font-semibold text-gray-700">
                                    City
                                </label>

                                <input
                                    type="text"
                                    value={
                                        form.address.city
                                    }
                                    onChange={(event) => {
                                        setForm((previous) => ({
                                            ...previous,

                                            address: {
                                                ...previous.address,
                                                city:
                                                    event.target.value,
                                            },
                                        }));
                                    }}
                                    placeholder="City"
                                    className="h-10 w-full rounded-md border border-gray-300 px-3 text-sm outline-none placeholder:text-gray-400 focus:border-[#FE5720] focus:ring-1 focus:ring-[#FE5720]/20"
                                />
                            </div>

                            {/* State */}

                            <div>
                                <label className="mb-1 block text-xs font-semibold text-gray-700">
                                    State
                                </label>

                                <input
                                    type="text"
                                    value={
                                        form.address.state
                                    }
                                    onChange={(event) => {
                                        setForm((previous) => ({
                                            ...previous,

                                            address: {
                                                ...previous.address,
                                                state:
                                                    event.target.value,
                                            },
                                        }));
                                    }}
                                    placeholder="State"
                                    className="h-10 w-full rounded-md border border-gray-300 px-3 text-sm outline-none placeholder:text-gray-400 focus:border-[#FE5720] focus:ring-1 focus:ring-[#FE5720]/20"
                                />
                            </div>
                        </div>

                        {/* District + Pincode */}

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            {/* District */}

                            <div>
                                <label className="mb-1 block text-xs font-semibold text-gray-700">
                                    District
                                </label>

                                <input
                                    type="text"
                                    value={
                                        form.address.district
                                    }
                                    onChange={(event) => {
                                        setForm((previous) => ({
                                            ...previous,

                                            address: {
                                                ...previous.address,
                                                district:
                                                    event.target.value,
                                            },
                                        }));
                                    }}
                                    placeholder="District"
                                    className="h-10 w-full rounded-md border border-gray-300 px-3 text-sm outline-none placeholder:text-gray-400 focus:border-[#FE5720] focus:ring-1 focus:ring-[#FE5720]/20"
                                />
                            </div>

                            {/* Pincode */}

                            <div>
                                <label className="mb-1 block text-xs font-semibold text-gray-700">
                                    Pincode
                                </label>

                                <input
                                    type="text"
                                    inputMode="numeric"
                                    maxLength={6}
                                    value={
                                        form.address.pincode
                                    }
                                    onChange={(event) => {
                                        setForm((previous) => ({
                                            ...previous,

                                            address: {
                                                ...previous.address,

                                                pincode:
                                                    event.target.value.replace(
                                                        /\D/g,
                                                        ""
                                                    ),
                                            },
                                        }));
                                    }}
                                    placeholder="Pincode"
                                    className="h-10 w-full rounded-md border border-gray-300 px-3 text-sm outline-none placeholder:text-gray-400 focus:border-[#FE5720] focus:ring-1 focus:ring-[#FE5720]/20"
                                />
                            </div>


                        </div>

                        {/* ------------------------------------------------------------------ */}
                        {/* Contact Information                                                */
                       /* ------------------------------------------------------------------ */}

                        <div className="mt-4">
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
                                        value={form.contactInformation.phone}
                                        onChange={(event) => {
                                            setForm((previous) => ({
                                                ...previous,

                                                contactInformation: {
                                                    ...previous.contactInformation,
                                                    phone:
                                                        event.target.value,
                                                },
                                            }));
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
                                        value={form.contactInformation.email}
                                        onChange={(event) => {
                                            setForm((previous) => ({
                                                ...previous,

                                                contactInformation: {
                                                    ...previous.contactInformation,
                                                    email:
                                                        event.target.value,
                                                },
                                            }));
                                        }}
                                        placeholder="name@company.com"
                                        className="h-10 w-full rounded-md border border-gray-300 px-3 text-sm outline-none placeholder:text-gray-400 focus:border-[#FE5720] focus:ring-1 focus:ring-[#FE5720]/20"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ---------------------------------------------------------------- */}
                    {/* Responsible Person                                                */}
                    {/* ---------------------------------------------------------------- */}

                    <div className="mt-6">

                        <h3 className="text-xs font-semibold text-gray-700">
                            RESPONSIBLE PERSON (OPTIONAL)
                        </h3>

                        <p className="mt-0.5 text-xs text-gray-500"> Select the person responsible for this location&apos;s day-to-day operations. </p>

                        {/* Name + Phone + Email */}

                        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">

                            {/* Name */}

                            <div>
                                <label className="mb-1 block text-xs font-semibold text-gray-700">
                                    Name
                                </label>

                                <div className="relative">

                                    <select
                                        value={form.responsiblePerson.id}
                                        onChange={(event) => {
                                            handleResponsiblePersonChange(
                                                event.target.value
                                            );
                                        }}
                                        className="h-10 w-full appearance-none rounded-md border border-gray-300 bg-white px-3 pr-10 text-sm text-gray-700 outline-none focus:border-[#FE5720] focus:ring-1 focus:ring-[#FE5720]/20"
                                    >
                                        <option value="">
                                            Select responsible person
                                        </option>

                                        {MOCK_CONTACTS.map((contact) => (
                                            <option
                                                key={contact.id}
                                                value={contact.id}
                                            >
                                                {contact.name}
                                            </option>
                                        ))}
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
                                    value={form.responsiblePerson.phone}
                                    readOnly
                                    placeholder="+91 98XXXXXXXX"
                                    className="h-10 w-full rounded-md border border-gray-300 bg-gray-50 px-3 text-sm text-gray-600 outline-none placeholder:text-gray-400"
                                />
                            </div>

                            {/* Email */}

                            <div>
                                <label className="mb-1 block text-xs font-semibold text-gray-700">
                                    Email
                                </label>

                                <input
                                    type="email"
                                    value={form.responsiblePerson.email}
                                    readOnly
                                    placeholder="name@company.com"
                                    className="h-10 w-full rounded-md border border-gray-300 bg-gray-50 px-3 text-sm text-gray-600 outline-none placeholder:text-gray-400"
                                />
                            </div>

                        </div>
                    </div>

                    {/* ---------------------------------------------------------------- */}
                    {/* Deputy                                                            */}
                    {/* ---------------------------------------------------------------- */}


                    <div className="mt-6">

                        <h3 className="text-xs font-semibold text-gray-700">
                            DEPUTY (OPTIONAL)
                        </h3>

                        <p className="mt-0.5 text-xs text-gray-500">
                            Alternate contact if the responsible person is unavailable.
                        </p>

                        {/* Name + Phone + Email */}

                        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">

                            {/* Name */}

                            <div>
                                <label className="mb-1 block text-xs font-semibold text-gray-700">
                                    Name
                                </label>

                                <div className="relative">

                                    <select
                                        value={form.deputy.id}
                                        onChange={(event) => {
                                            handleDeputyChange(
                                                event.target.value
                                            );
                                        }}
                                        className="h-10 w-full appearance-none rounded-md border border-gray-300 bg-white px-3 pr-10 text-sm text-gray-700 outline-none focus:border-[#FE5720] focus:ring-1 focus:ring-[#FE5720]/20"
                                    >
                                        <option value="">
                                            Select deputy
                                        </option>

                                        {MOCK_CONTACTS.map((contact) => (
                                            <option
                                                key={contact.id}
                                                value={contact.id}
                                            >
                                                {contact.name}
                                            </option>
                                        ))}
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
                                    value={form.deputy.phone}
                                    readOnly
                                    placeholder="+91 98XXXXXXXX"
                                    className="h-10 w-full rounded-md border border-gray-300 bg-gray-50 px-3 text-sm text-gray-600 outline-none placeholder:text-gray-400"
                                />
                            </div>

                            {/* Email */}

                            <div>
                                <label className="mb-1 block text-xs font-semibold text-gray-700">
                                    Email
                                </label>

                                <input
                                    type="email"
                                    value={form.deputy.email}
                                    readOnly
                                    placeholder="name@company.com"
                                    className="h-10 w-full rounded-md border border-gray-300 bg-gray-50 px-3 text-sm text-gray-600 outline-none placeholder:text-gray-400"
                                />
                            </div>

                        </div>
                    </div>

                    {/* ---------------------------------------------------------------- */}
                    {/* Error                                                             */}
                    {/* ---------------------------------------------------------------- */}

                    {error && (
                        <div className="mt-5 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                            {error}
                        </div>
                    )}

                    {/* ---------------------------------------------------------------- */}
                    {/* Actions                                                           */}
                    {/* ---------------------------------------------------------------- */}

                    <div className="mt-6 flex justify-end gap-2">

                        <button
                            type="button"
                            onClick={onCancel}
                            className="h-10 rounded-md border border-gray-300 bg-white px-5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                        >
                            Cancel
                        </button>

                        <Button
                            type="button"
                            onClick={handleSave}
                            disabled={isSaving}
                            className="h-10 px-5"
                        >
                            {isSaving
                                ? "Saving..."
                                : "Save location"}
                        </Button>
                    </div>
                </div>

                {/* ================================================================== */}
                {/* Information Box                                                    */}
                {/* ================================================================== */}

                {/* Information Box */}
                <div className="mt-4 flex gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 text-xs text-gray-500 sm:px-5">
                    <Info className="mt-0.5 h-4 w-4 shrink-0 text-gray-500" />

                    <p> Locations aren&apos;t just for warehousing — Offices, Workshops, Retail Outlets and more all live in this same register, and are what Asset Management and Inventory select from when marking a vehicle&apos;s or part&apos;s location. </p>
                </div>
            </div>
        </div>
    );
}