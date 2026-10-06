"use client";

import { ChangeEvent } from "react";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

export type OrganizationAddress = {
    line1: string;
    line2: string;
    city: string;
    state: string;
    district: string;
    pincode: string;
    country: string;
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

    required?: boolean;
};

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

export default function OrganizationAddressForm({
    value,
    onChange,
    errors,
    title = "ADDRESS",
    required = true,
}: OrganizationAddressFormProps) {
    /* ---------------------------------------------------------------------- */
    /* Update Field                                                            */
    /* ---------------------------------------------------------------------- */

    const updateField = (
        field: keyof OrganizationAddress,
        fieldValue: string
    ) => {
        onChange({
            ...value,
            [field]: fieldValue,
        });
    };

    /* ---------------------------------------------------------------------- */
    /* Pincode Handler                                                         */
    /* ---------------------------------------------------------------------- */

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

    /* ---------------------------------------------------------------------- */
    /* Input Class                                                             */
    /* ---------------------------------------------------------------------- */

    const inputClass = (
        field: keyof OrganizationAddress
    ) =>
        [
            "h-10 w-full rounded-md border px-3 text-sm outline-none placeholder:text-gray-400",
            errors?.[field]
                ? "border-red-400 focus:border-red-500 focus:ring-1 focus:ring-red-500/20"
                : "border-gray-300 focus:border-[#FE5720] focus:ring-1 focus:ring-[#FE5720]/20",
        ].join(" ");

    /* ---------------------------------------------------------------------- */
    /* Required Mark                                                           */
    /* ---------------------------------------------------------------------- */

    const RequiredMark = () =>
        required ? (
            <span className="ml-1 text-red-500">
                *
            </span>
        ) : null;

    /* ---------------------------------------------------------------------- */
    /* Error Message                                                           */
    /* ---------------------------------------------------------------------- */

    const ErrorMessage = ({
        field,
    }: {
        field: keyof OrganizationAddress;
    }) => {
        if (!errors?.[field]) {
            return null;
        }

        return (
            <p className="mt-1 text-xs text-red-500">
                {errors[field]}
            </p>
        );
    };

    /* ---------------------------------------------------------------------- */
    /* Render                                                                  */
    /* ---------------------------------------------------------------------- */

    return (
        <div className="mt-5">
            {/* ---------------------------------------------------------------- */}
            {/* Address Heading                                                   */}
            {/* ---------------------------------------------------------------- */}

            <h3 className="text-xs font-semibold text-gray-700">
                {title}
            </h3>

            {/* ---------------------------------------------------------------- */}
            {/* Address Fields                                                    */}
            {/* ---------------------------------------------------------------- */}

            <div className="mt-2 space-y-3">
                {/* ========================================================== */}
                {/* Address Line 1                                               */}
                {/* ========================================================== */}

                <div>
                    <label className="mb-1 block text-xs font-semibold text-gray-700">
                        Address Line 1
                        <RequiredMark />
                    </label>

                    <input
                        type="text"
                        value={value.line1}
                        onChange={(
                            event: ChangeEvent<HTMLInputElement>
                        ) =>
                            updateField(
                                "line1",
                                event.target.value
                            )
                        }
                        placeholder="Street, building, area"
                        className={inputClass("line1")}
                    />

                    <ErrorMessage field="line1" />
                </div>

                {/* ========================================================== */}
                {/* Address Line 2                                               */}
                {/* ========================================================== */}

                <div>
                    <label className="mb-1 block text-xs font-semibold text-gray-700">
                        Address Line 2
                    </label>

                    <input
                        type="text"
                        value={value.line2}
                        onChange={(
                            event: ChangeEvent<HTMLInputElement>
                        ) =>
                            updateField(
                                "line2",
                                event.target.value
                            )
                        }
                        placeholder="Landmark, locality, apartment, etc."
                        className={inputClass("line2")}
                    />

                    <ErrorMessage field="line2" />
                </div>

                {/* ========================================================== */}
                {/* City + State                                                 */}
                {/* ========================================================== */}

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {/* ------------------------------------------------------ */}
                    {/* City                                                     */}
                    {/* ------------------------------------------------------ */}

                    <div>
                        <label className="mb-1 block text-xs font-semibold text-gray-700">
                            City
                            <RequiredMark />
                        </label>

                        <input
                            type="text"
                            value={value.city}
                            onChange={(
                                event: ChangeEvent<HTMLInputElement>
                            ) =>
                                updateField(
                                    "city",
                                    event.target.value
                                )
                            }
                            placeholder="City"
                            className={inputClass("city")}
                        />

                        <ErrorMessage field="city" />
                    </div>

                    {/* ------------------------------------------------------ */}
                    {/* State                                                    */}
                    {/* ------------------------------------------------------ */}

                    <div>
                        <label className="mb-1 block text-xs font-semibold text-gray-700">
                            State
                            <RequiredMark />
                        </label>

                        <input
                            type="text"
                            value={value.state}
                            onChange={(
                                event: ChangeEvent<HTMLInputElement>
                            ) =>
                                updateField(
                                    "state",
                                    event.target.value
                                )
                            }
                            placeholder="State"
                            className={inputClass("state")}
                        />

                        <ErrorMessage field="state" />
                    </div>
                </div>

                {/* ========================================================== */}
                {/* District + Country                                          */}
                {/* ========================================================== */}

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {/* ------------------------------------------------------ */}
                    {/* District                                                 */}
                    {/* ------------------------------------------------------ */}

                    <div>
                        <label className="mb-1 block text-xs font-semibold text-gray-700">
                            District
                            <RequiredMark />
                        </label>

                        <input
                            type="text"
                            value={value.district}
                            onChange={(
                                event: ChangeEvent<HTMLInputElement>
                            ) =>
                                updateField(
                                    "district",
                                    event.target.value
                                )
                            }
                            placeholder="District"
                            className={inputClass("district")}
                        />

                        <ErrorMessage field="district" />
                    </div>

                    {/* ------------------------------------------------------ */}
                    {/* Country                                                  */}
                    {/* ------------------------------------------------------ */}

                    <div>
                        <label className="mb-1 block text-xs font-semibold text-gray-700">
                            Country
                            <RequiredMark />
                        </label>

                        <input
                            type="text"
                            value={value.country}
                            onChange={(
                                event: ChangeEvent<HTMLInputElement>
                            ) =>
                                updateField(
                                    "country",
                                    event.target.value
                                )
                            }
                            placeholder="Country"
                            className={inputClass("country")}
                        />

                        <ErrorMessage field="country" />
                    </div>
                </div>

                {/* ========================================================== */}
                {/* Pincode                                                      */}
                {/* ========================================================== */}

                <div>
                    <label className="mb-1 block text-xs font-semibold text-gray-700">
                        Pincode
                        <RequiredMark />
                    </label>

                    <input
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        value={value.pincode}
                        onChange={(
                            event: ChangeEvent<HTMLInputElement>
                        ) =>
                            handlePincodeChange(
                                event.target.value
                            )
                        }
                        placeholder="Pincode"
                        className={inputClass("pincode")}
                    />

                    <ErrorMessage field="pincode" />
                </div>
            </div>
        </div>
    );
}