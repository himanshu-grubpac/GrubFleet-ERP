/* -------------------------------------------------------------------------- */
/* Common Frontend Validation                                                 */
/* -------------------------------------------------------------------------- */

import {
    DEFAULT_COUNTRY_CODE,
    getCountryDefinition,
} from "@/lib/geo/countries";

import {
    isValidPostalForCountry,
    postalRequiredMessage,
    postalValidationMessage,
} from "@/lib/geo/postal";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

export type ValidationErrors = Record<string, string>;

/**
 * Backward compatibility for existing Organization forms.
 * Existing imports of OrganizationValidationErrors will continue to work.
 */
export type OrganizationValidationErrors = ValidationErrors;

export type ValidationOptions = {
    required?: boolean;
    label?: string;
};

export type OrganizationAddressValidationValue = {
    line1: string;
    line2: string;
    city: string;
    state: string;
    district: string;
    pincode: string;
    country: string;
};

type OrganizationAddressValidationOptions = {
    requireLine2?: boolean;
};

/* -------------------------------------------------------------------------- */
/* Common Helpers                                                             */
/* -------------------------------------------------------------------------- */

export const isEmpty = (value: unknown): boolean => {
    if (value === undefined || value === null) {
        return true;
    }

    if (typeof value === "string") {
        return value.trim() === "";
    }

    if (Array.isArray(value)) {
        return value.length === 0;
    }

    return false;
};

/**
 * Returns the first validation error for a required field.
 */
export const validateRequired = (
    value: unknown,
    label: string,
): string | undefined => {
    if (isEmpty(value)) {
        return `${label} is required.`;
    }

    return undefined;
};

/* -------------------------------------------------------------------------- */
/* Email                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Required by default to preserve existing behavior.
 * Pass { required: false } for optional email fields.
 */
export const validateEmail = (
    value: string | null | undefined,
    label = "Email",
    options: ValidationOptions = {},
): string | undefined => {
    const required = options.required ?? true;

    if (isEmpty(value)) {
        return required
            ? `${label} is required.`
            : undefined;
    }

    const email = value!.trim();

    // Practical frontend format check; backend validation remains authoritative.
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(email)) {
        return `Enter a valid ${label.toLowerCase()}.`;
    }

    return undefined;
};

/* -------------------------------------------------------------------------- */
/* Phone                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Checks digit count without silently treating any arbitrary string
 * as a valid phone number.
 *
 * Use country-specific phone validation when the application requires
 * international phone-number support.
 */
export const validatePhone = (
    value: string | null | undefined,
    label = "Phone",
    options: ValidationOptions = {},
): string | undefined => {
    const required = options.required ?? true;

    if (isEmpty(value)) {
        return required
            ? `${label} is required.`
            : undefined;
    }

    const phone = value!.trim();

    // Permit common visual separators, but reject other characters.
    if (!/^\+?[\d\s().-]+$/.test(phone)) {
        return `Enter a valid ${label.toLowerCase()}.`;
    }

    const digits = phone.replace(/\D/g, "");

    if (digits.length < 10 || digits.length > 15) {
        return `${label} must contain between 10 and 15 digits.`;
    }

    return undefined;
};

/* -------------------------------------------------------------------------- */
/* Number                                                                     */
/* -------------------------------------------------------------------------- */

export type NumberValidationOptions = {
    label?: string;
    required?: boolean;
    min?: number;
    max?: number;
    integer?: boolean;
};

export const validateNumber = (
    value: unknown,
    options: NumberValidationOptions = {},
): string | undefined => {
    const {
        label = "Value",
        required = true,
        min,
        max,
        integer = false,
    } = options;

    if (isEmpty(value)) {
        return required ? `${label} is required.` : undefined;
    }

    // Do not accept booleans, objects, or whitespace as numeric values.
    if (
        typeof value !== "number" &&
        typeof value !== "string"
    ) {
        return `Enter a valid ${label.toLowerCase()}.`;
    }

    if (
        typeof value === "string" &&
        !/^-?(?:\d+\.?\d*|\.\d+)$/.test(value.trim())
    ) {
        return `Enter a valid ${label.toLowerCase()}.`;
    }

    const number = Number(value);

    if (!Number.isFinite(number)) {
        return `Enter a valid ${label.toLowerCase()}.`;
    }

    if (integer && !Number.isInteger(number)) {
        return `${label} must be a whole number.`;
    }

    if (min !== undefined && number < min) {
        return `${label} must be at least ${min}.`;
    }

    if (max !== undefined && number > max) {
        return `${label} must not exceed ${max}.`;
    }

    return undefined;
};

/* -------------------------------------------------------------------------- */
/* String Length                                                              */
/* -------------------------------------------------------------------------- */

export type StringLengthValidationOptions = {
    label?: string;
    required?: boolean;
    minLength?: number;
    maxLength?: number;
};

export const validateStringLength = (
    value: string | null | undefined,
    options: StringLengthValidationOptions = {},
): string | undefined => {
    const {
        label = "Value",
        required = true,
        minLength,
        maxLength,
    } = options;

    if (isEmpty(value)) {
        return required ? `${label} is required.` : undefined;
    }

    const length = value!.trim().length;

    if (minLength !== undefined && length < minLength) {
        return `${label} must contain at least ${minLength} characters.`;
    }

    if (maxLength !== undefined && length > maxLength) {
        return `${label} must not exceed ${maxLength} characters.`;
    }

    return undefined;
};

/* -------------------------------------------------------------------------- */
/* Date                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Expects an ISO-style date string, such as YYYY-MM-DD.
 * Optional minDate and maxDate must use the same format.
 */
export type DateValidationOptions = {
    label?: string;
    required?: boolean;
    minDate?: string;
    maxDate?: string;
};

const isValidISODate = (value: string): boolean => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return false;
    }

    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));

    return (
        date.getUTCFullYear() === year &&
        date.getUTCMonth() === month - 1 &&
        date.getUTCDate() === day
    );
};

export const validateDate = (
    value: string | null | undefined,
    options: DateValidationOptions = {},
): string | undefined => {
    const {
        label = "Date",
        required = true,
        minDate,
        maxDate,
    } = options;

    if (isEmpty(value)) {
        return required ? `${label} is required.` : undefined;
    }

    const date = value!.trim();

    if (!isValidISODate(date)) {
        return `Enter a valid ${label.toLowerCase()}.`;
    }

    if (minDate && date < minDate) {
        return `${label} must be on or after ${minDate}.`;
    }

    if (maxDate && date > maxDate) {
        return `${label} must be on or before ${maxDate}.`;
    }

    return undefined;
};

/* -------------------------------------------------------------------------- */
/* Organization Address                                                      */
/* -------------------------------------------------------------------------- */

export const validateOrganizationAddress = (
    address: OrganizationAddressValidationValue,
    options?: OrganizationAddressValidationOptions,
): ValidationErrors => {
    const errors: ValidationErrors = {};

    const countryCode =
        address.country?.trim() || DEFAULT_COUNTRY_CODE;

    const countryDef = getCountryDefinition(countryCode);

    if (isEmpty(address.line1)) {
        errors.line1 = "Address Line 1 is required.";
    }

    if (options?.requireLine2 && isEmpty(address.line2)) {
        errors.line2 = "Address Line 2 is required.";
    }

    if (isEmpty(address.state)) {
        errors.state = `${countryDef.regionLabel} is required.`;
    }

    if (countryDef.showDistrict) {
        if (isEmpty(address.district)) {
            errors.district = "District is required.";
        }
    } else if (isEmpty(address.city)) {
        errors.city = "City is required.";
    }

    const pincode = address.pincode?.trim() ?? "";

    if (!pincode) {
        errors.pincode = postalRequiredMessage(countryCode);
    } else if (!isValidPostalForCountry(countryCode, pincode)) {
        errors.pincode = postalValidationMessage(countryCode);
    }

    return errors;
};

/* -------------------------------------------------------------------------- */
/* Validation Result                                                          */
/* -------------------------------------------------------------------------- */

export const hasValidationErrors = (
    errors: ValidationErrors,
): boolean => {
    return Object.keys(errors).length > 0;
};

/* -------------------------------------------------------------------------- */
/* Nested Validation Errors                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Adds nested errors under a field prefix.
 *
 * Example:
 * { line1: "Address Line 1 is required." }
 *
 * becomes:
 * { "address.line1": "Address Line 1 is required." }
 */
export const addNestedValidationErrors = (
    errors: ValidationErrors,
    nestedErrors: ValidationErrors,
    prefix: string,
): ValidationErrors => {
    const result = { ...errors };

    Object.entries(nestedErrors).forEach(([field, message]) => {
        const path = prefix
            ? `${prefix}.${field}`
            : field;

        result[path] = message;
    });

    return result;
};

/**
 * Backward-compatible helper for the existing Organization forms.
 */
export const addAddressValidationErrors = (
    errors: ValidationErrors,
    addressErrors: ValidationErrors,
): ValidationErrors => {
    return addNestedValidationErrors(
        errors,
        addressErrors,
        "address",
    );
};

/* -------------------------------------------------------------------------- */
/* Form Error Messages                                                        */
/* -------------------------------------------------------------------------- */

export const getFirstValidationError = (
    errors: ValidationErrors,
): string | undefined => {
    return Object.values(errors).find(
        (message) => message.trim().length > 0,
    );
};