"use client";

import {
    useEffect,
    useState,
} from "react";

export type OrganizationAddress = {
    line1: string;
    line2: string;
    city: string;
    state: string;
    district: string;
    pincode: string;
};

type OrganizationAddressFormProps = {
    value: OrganizationAddress;

    onChange: (
        value: OrganizationAddress
    ) => void;

    errors?: Partial<
        Record<keyof OrganizationAddress, string>
    >;

    title?: string;

    collapsible?: boolean;

    defaultExpanded?: boolean;

    required?: boolean;
};

export default function OrganizationAddressForm({
    value,
    onChange,
    errors,
    title = "ADDRESS",
    collapsible = true,
    defaultExpanded = false,
    required = true,
}: OrganizationAddressFormProps) {
    const [expanded, setExpanded] =
        useState(defaultExpanded);

    /*
     * Automatically expand the address section
     * whenever validation errors are received.
     */
    useEffect(() => {
        const hasErrors =
            errors &&
            Object.values(errors).some(
                (message) => Boolean(message)
            );

        if (hasErrors) {
            setExpanded(true);
        }
    }, [errors]);

    const updateField = (
        field: keyof OrganizationAddress,
        fieldValue: string
    ) => {
        onChange({
            ...value,
            [field]: fieldValue,
        });
    };

    /*
     * Clicking/focusing Address Line 1
     * opens the remaining address fields.
     */
    const handleLine1Focus = () => {
        if (collapsible) {
            setExpanded(true);
        }
    };

    /*
     * Pincode:
     * - Numbers only
     * - Maximum 6 digits
     */
    const handlePincodeChange = (
        fieldValue: string
    ) => {
        updateField(
            "pincode",
            fieldValue
                .replace(/\D/g, "")
                .slice(0, 6)
        );
    };

    const inputClass = (
        field: keyof OrganizationAddress
    ) =>
        [
            "h-10 w-full rounded-md border px-3 text-sm outline-none placeholder:text-gray-400",
            errors?.[field]
                ? "border-red-400 focus:border-red-500 focus:ring-1 focus:ring-red-500/20"
                : "border-gray-300 focus:border-[#FE5720] focus:ring-1 focus:ring-[#FE5720]/20",
        ].join(" ");

    return (
        <div className="mt-5">

            {/* ---------------------------------------------------------------- */}
            {/* Address heading                                                  */}
            {/* ---------------------------------------------------------------- */}

            <h3 className="text-xs font-semibold text-gray-700">
                {title}
            </h3>

            <div className="mt-2 space-y-3">

                {/* ---------------------------------------------------------------- */}
                {/* Address Line 1                                                   */}
                {/* ---------------------------------------------------------------- */}

                <div>
                    <label className="mb-1 block text-xs font-semibold text-gray-700">
                        Address Line 1

                        {required && (
                            <span className="ml-1 text-red-500">
                                *
                            </span>
                        )}
                    </label>

                    <input
                        type="text"
                        value={value.line1}
                        onFocus={handleLine1Focus}
                        onChange={(event) => {
                            updateField(
                                "line1",
                                event.target.value
                            );

                            if (collapsible) {
                                setExpanded(true);
                            }
                        }}
                        placeholder="Street, building, area"
                        className={inputClass(
                            "line1"
                        )}
                    />

                    {errors?.line1 && (
                        <p className="mt-1 text-xs text-red-500">
                            {errors.line1}
                        </p>
                    )}
                </div>

                {/* ---------------------------------------------------------------- */}
                {/* Remaining Address Fields                                         */}
                {/* ---------------------------------------------------------------- */}

                {(!collapsible || expanded) && (
                    <div className="space-y-3">

                        {/* -------------------------------------------------------- */}
                        {/* Address Line 2                                             */}
                        {/* -------------------------------------------------------- */}

                        <div>
                            <label className="mb-1 block text-xs font-semibold text-gray-700">
                                Address Line 2
                            </label>

                            <input
                                type="text"
                                value={value.line2}
                                onChange={(event) =>
                                    updateField(
                                        "line2",
                                        event.target.value
                                    )
                                }
                                placeholder="Landmark, locality, apartment, etc."
                                className={inputClass(
                                    "line2"
                                )}
                            />

                            {errors?.line2 && (
                                <p className="mt-1 text-xs text-red-500">
                                    {errors.line2}
                                </p>
                            )}
                        </div>

                        {/* -------------------------------------------------------- */}
                        {/* City + State                                               */}
                        {/* -------------------------------------------------------- */}

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">

                            {/* City */}

                            <div>
                                <label className="mb-1 block text-xs font-semibold text-gray-700">
                                    City

                                    {required && (
                                        <span className="ml-1 text-red-500">
                                            *
                                        </span>
                                    )}
                                </label>

                                <input
                                    type="text"
                                    value={value.city}
                                    onChange={(event) =>
                                        updateField(
                                            "city",
                                            event.target.value
                                        )
                                    }
                                    placeholder="City"
                                    className={inputClass(
                                        "city"
                                    )}
                                />

                                {errors?.city && (
                                    <p className="mt-1 text-xs text-red-500">
                                        {errors.city}
                                    </p>
                                )}
                            </div>

                            {/* State */}

                            <div>
                                <label className="mb-1 block text-xs font-semibold text-gray-700">
                                    State

                                    {required && (
                                        <span className="ml-1 text-red-500">
                                            *
                                        </span>
                                    )}
                                </label>

                                <input
                                    type="text"
                                    value={value.state}
                                    onChange={(event) =>
                                        updateField(
                                            "state",
                                            event.target.value
                                        )
                                    }
                                    placeholder="State"
                                    className={inputClass(
                                        "state"
                                    )}
                                />

                                {errors?.state && (
                                    <p className="mt-1 text-xs text-red-500">
                                        {errors.state}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* -------------------------------------------------------- */}
                        {/* District + Pincode                                        */}
                        {/* -------------------------------------------------------- */}

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">

                            {/* District */}

                            <div>
                                <label className="mb-1 block text-xs font-semibold text-gray-700">
                                    District

                                    {required && (
                                        <span className="ml-1 text-red-500">
                                            *
                                        </span>
                                    )}
                                </label>

                                <input
                                    type="text"
                                    value={
                                        value.district
                                    }
                                    onChange={(event) =>
                                        updateField(
                                            "district",
                                            event.target.value
                                        )
                                    }
                                    placeholder="District"
                                    className={inputClass(
                                        "district"
                                    )}
                                />

                                {errors?.district && (
                                    <p className="mt-1 text-xs text-red-500">
                                        {
                                            errors.district
                                        }
                                    </p>
                                )}
                            </div>

                            {/* Pincode */}

                            <div>
                                <label className="mb-1 block text-xs font-semibold text-gray-700">
                                    Pincode

                                    {required && (
                                        <span className="ml-1 text-red-500">
                                            *
                                        </span>
                                    )}
                                </label>

                                <input
                                    type="text"
                                    inputMode="numeric"
                                    maxLength={6}
                                    value={
                                        value.pincode
                                    }
                                    onChange={(event) =>
                                        handlePincodeChange(
                                            event.target
                                                .value
                                        )
                                    }
                                    placeholder="Pincode"
                                    className={inputClass(
                                        "pincode"
                                    )}
                                />

                                {errors?.pincode && (
                                    <p className="mt-1 text-xs text-red-500">
                                        {
                                            errors.pincode
                                        }
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}