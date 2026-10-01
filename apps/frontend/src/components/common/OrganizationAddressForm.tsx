"use client";

import { useEffect, useMemo, useState } from "react";

import { CountrySelect } from "@/components/geo/CountrySelect";
import { RegionSelect } from "@/components/geo/RegionSelect";
import { RestrictedInput } from "@/components/ui/RestrictedInput";
import { DEFAULT_COUNTRY_CODE, getCountryDefinition } from "@/lib/geo/countries";
import { getPostalPlaceholder } from "@/lib/geo/placeholders";
import { getPostalRestrictedKindForCountry } from "@/lib/geo/postal";
import { ORG_INPUT_LIMITS } from "@/lib/forms/restricted-input";

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
    onChange: (value: OrganizationAddress) => void;
    errors?: Partial<Record<keyof OrganizationAddress, string>>;
    title?: string;
    collapsible?: boolean;
    defaultExpanded?: boolean;
    required?: boolean;
};

const INPUT_FIELD_CLASS =
    "h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-[#FE5720] focus:ring-1 focus:ring-[#FE5720]/20";

const SELECT_FIELD_CLASS =
    "h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none focus:border-[#FE5720] focus:ring-1 focus:ring-[#FE5720]/20";

function fieldClass(hasError: boolean): string {
    return hasError
        ? "h-10 w-full rounded-md border border-red-400 px-3 text-sm outline-none placeholder:text-gray-400 focus:border-red-500 focus:ring-1 focus:ring-red-500/20"
        : INPUT_FIELD_CLASS;
}

export default function OrganizationAddressForm({
    value,
    onChange,
    errors,
    title = "ADDRESS",
    collapsible = false,
    defaultExpanded = true,
    required = true,
}: OrganizationAddressFormProps) {
    const [expanded, setExpanded] = useState(defaultExpanded);

    const countryCode = value.country?.trim() || DEFAULT_COUNTRY_CODE;

    const addressCountryDef = useMemo(
        () => getCountryDefinition(countryCode),
        [countryCode],
    );

    const postalRestrictedKind = useMemo(
        () => getPostalRestrictedKindForCountry(countryCode),
        [countryCode],
    );

    const postalFieldPlaceholder = useMemo(
        () => getPostalPlaceholder(countryCode),
        [countryCode],
    );

    useEffect(() => {
        const hasErrors =
            errors && Object.values(errors).some((message) => Boolean(message));

        if (hasErrors) {
            setExpanded(true);
        }
    }, [errors]);

    const updateField = <K extends keyof OrganizationAddress>(
        field: K,
        fieldValue: OrganizationAddress[K],
    ) => {
        onChange({
            ...value,
            [field]: fieldValue,
        });
    };

    const handleLine1Focus = () => {
        if (collapsible) {
            setExpanded(true);
        }
    };

    return (
        <div className="mt-5">
            <h3 className="text-xs font-semibold text-gray-700">{title}</h3>

            <div className="mt-2 space-y-3">
                <div>
                    <label className="mb-1 block text-xs font-semibold text-gray-700">
                        Address Line 1
                        {required ? (
                            <span className="ml-1 text-red-500">*</span>
                        ) : null}
                    </label>

                    <RestrictedInput
                        restrictedKind="text"
                        maxLength={ORG_INPUT_LIMITS.addressLine}
                        value={value.line1}
                        onFocus={handleLine1Focus}
                        onChange={(line1) => {
                            updateField("line1", line1);
                            if (collapsible) {
                                setExpanded(true);
                            }
                        }}
                        placeholder="Street, building, area"
                        aria-invalid={Boolean(errors?.line1)}
                        className={fieldClass(Boolean(errors?.line1))}
                    />

                    {errors?.line1 ? (
                        <p className="mt-1 text-xs text-red-500">{errors.line1}</p>
                    ) : null}
                </div>

                {(!collapsible || expanded) && (
                    <div className="space-y-3">
                        <div>
                            <label className="mb-1 block text-xs font-semibold text-gray-700">
                                Address Line 2
                            </label>

                            <RestrictedInput
                                restrictedKind="text"
                                maxLength={ORG_INPUT_LIMITS.addressLine}
                                value={value.line2}
                                onChange={(line2) => updateField("line2", line2)}
                                placeholder="Landmark, locality, apartment, etc."
                                aria-invalid={Boolean(errors?.line2)}
                                className={fieldClass(Boolean(errors?.line2))}
                            />

                            {errors?.line2 ? (
                                <p className="mt-1 text-xs text-red-500">
                                    {errors.line2}
                                </p>
                            ) : null}
                        </div>

                        <div>
                            <label
                                className="mb-1 block text-xs font-semibold text-gray-700"
                                htmlFor="organization-address-country"
                            >
                                Country
                                {required ? (
                                    <span className="ml-1 text-red-500">*</span>
                                ) : null}
                            </label>

                            <CountrySelect
                                id="organization-address-country"
                                value={countryCode}
                                onChange={(country) => {
                                    const nextCountryDef =
                                        getCountryDefinition(country);
                                    onChange({
                                        ...value,
                                        country,
                                        state: "",
                                        pincode: "",
                                        ...(nextCountryDef.showDistrict
                                            ? { city: "" }
                                            : { district: "" }),
                                    });
                                }}
                                className={
                                    errors?.country
                                        ? fieldClass(true)
                                        : SELECT_FIELD_CLASS
                                }
                                required={required}
                            />

                            {errors?.country ? (
                                <p className="mt-1 text-xs text-red-500">
                                    {errors.country}
                                </p>
                            ) : null}
                        </div>

                        {!addressCountryDef.showDistrict ? (
                            <div>
                                <label className="mb-1 block text-xs font-semibold text-gray-700">
                                    City
                                    {required ? (
                                        <span className="ml-1 text-red-500">
                                            *
                                        </span>
                                    ) : null}
                                </label>

                                <RestrictedInput
                                    restrictedKind="text"
                                    maxLength={ORG_INPUT_LIMITS.addressRegion}
                                    value={value.city}
                                    onChange={(city) =>
                                        updateField("city", city)
                                    }
                                    placeholder="City"
                                    aria-invalid={Boolean(errors?.city)}
                                    className={fieldClass(Boolean(errors?.city))}
                                />

                                {errors?.city ? (
                                    <p className="mt-1 text-xs text-red-500">
                                        {errors.city}
                                    </p>
                                ) : null}
                            </div>
                        ) : null}

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div>
                                <label className="mb-1 block text-xs font-semibold text-gray-700">
                                    {addressCountryDef.regionLabel}
                                    {required ? (
                                        <span className="ml-1 text-red-500">*</span>
                                    ) : null}
                                </label>

                                <RegionSelect
                                    countryCode={countryCode}
                                    value={value.state}
                                    onChange={(state) => updateField("state", state)}
                                    selectClassName={
                                        errors?.state
                                            ? fieldClass(true)
                                            : SELECT_FIELD_CLASS
                                    }
                                    inputClassName={fieldClass(Boolean(errors?.state))}
                                />

                                {errors?.state ? (
                                    <p className="mt-1 text-xs text-red-500">
                                        {errors.state}
                                    </p>
                                ) : null}
                            </div>

                            {addressCountryDef.showDistrict ? (
                                <div>
                                    <label className="mb-1 block text-xs font-semibold text-gray-700">
                                        District
                                        {required ? (
                                            <span className="ml-1 text-red-500">*</span>
                                        ) : null}
                                    </label>

                                    <RestrictedInput
                                        restrictedKind="text"
                                        maxLength={ORG_INPUT_LIMITS.addressRegion}
                                        value={value.district}
                                        onChange={(district) =>
                                            updateField("district", district)
                                        }
                                        placeholder="District"
                                        aria-invalid={Boolean(errors?.district)}
                                        className={fieldClass(
                                            Boolean(errors?.district),
                                        )}
                                    />

                                    {errors?.district ? (
                                        <p className="mt-1 text-xs text-red-500">
                                            {errors.district}
                                        </p>
                                    ) : null}
                                </div>
                            ) : null}
                        </div>

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div>
                                <label className="mb-1 block text-xs font-semibold text-gray-700">
                                    {addressCountryDef.postalLabel}
                                    {required ? (
                                        <span className="ml-1 text-red-500">*</span>
                                    ) : null}
                                </label>

                                <RestrictedInput
                                    restrictedKind={postalRestrictedKind}
                                    maxLength={ORG_INPUT_LIMITS.postalGeneric}
                                    value={value.pincode}
                                    onChange={(pincode) =>
                                        updateField("pincode", pincode)
                                    }
                                    placeholder={postalFieldPlaceholder}
                                    aria-invalid={Boolean(errors?.pincode)}
                                    className={fieldClass(Boolean(errors?.pincode))}
                                />

                                {errors?.pincode ? (
                                    <p className="mt-1 text-xs text-red-500">
                                        {errors.pincode}
                                    </p>
                                ) : null}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
