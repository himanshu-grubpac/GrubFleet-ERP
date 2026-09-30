/* -------------------------------------------------------------------------- */
/* Organization Validation                                                   */
/* -------------------------------------------------------------------------- */

export type OrganizationValidationErrors = Record<
    string,
    string
>;

/* -------------------------------------------------------------------------- */
/* Common Helpers                                                             */
/* -------------------------------------------------------------------------- */

export const isEmpty = (
    value: unknown
): boolean => {
    return (
        value === undefined ||
        value === null ||
        String(value).trim() === ""
    );
};

/* -------------------------------------------------------------------------- */
/* Required                                                                   */
/* -------------------------------------------------------------------------- */

export const validateRequired = (
    value: unknown,
    label: string
): string | undefined => {
    if (isEmpty(value)) {
        return `${label} is required.`;
    }

    return undefined;
};

/* -------------------------------------------------------------------------- */
/* Email                                                                      */
/* -------------------------------------------------------------------------- */

export const validateEmail = (
    value: string,
    label = "Email"
): string | undefined => {
    if (isEmpty(value)) {
        return `${label} is required.`;
    }

    const email = value.trim();

    const emailPattern =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(email)) {
        return `Enter a valid ${label.toLowerCase()}.`;
    }

    return undefined;
};

/* -------------------------------------------------------------------------- */
/* Phone                                                                      */
/* -------------------------------------------------------------------------- */

export const validatePhone = (
    value: string,
    label = "Phone"
): string | undefined => {
    if (isEmpty(value)) {
        return `${label} is required.`;
    }

    const phone = value.replace(/\D/g, "");

    if (phone.length < 10) {
        return `${label} must contain at least 10 digits.`;
    }

    return undefined;
};

/* -------------------------------------------------------------------------- */
/* Pincode                                                                    */
/* -------------------------------------------------------------------------- */

export const validatePincode = (
    value: string
): string | undefined => {
    if (isEmpty(value)) {
        return "Pincode is required.";
    }

    if (!/^\d{6}$/.test(value.trim())) {
        return "Pincode must contain 6 digits.";
    }

    return undefined;
};

/* -------------------------------------------------------------------------- */
/* Organization Address                                                      */
/* -------------------------------------------------------------------------- */

export type OrganizationAddressValidationValue = {
    line1: string;
    line2: string;
    city: string;
    state: string;
    district: string;
    pincode: string;
};

type OrganizationAddressValidationOptions = {
    requireLine2?: boolean;
};

export const validateOrganizationAddress = (
    address: OrganizationAddressValidationValue,
    options?: OrganizationAddressValidationOptions
): OrganizationValidationErrors => {
    const errors: OrganizationValidationErrors = {};

    /* Address Line 1 */

    if (isEmpty(address.line1)) {
        errors.line1 =
            "Address Line 1 is required.";
    }

    /* Address Line 2 */

    if (
        options?.requireLine2 &&
        isEmpty(address.line2)
    ) {
        errors.line2 =
            "Address Line 2 is required.";
    }

    /* City */

    if (isEmpty(address.city)) {
        errors.city = "City is required.";
    }

    /* State */

    if (isEmpty(address.state)) {
        errors.state = "State is required.";
    }

    /* District */

    if (isEmpty(address.district)) {
        errors.district =
            "District is required.";
    }

    /* Pincode */

    const pincodeError =
        validatePincode(address.pincode);

    if (pincodeError) {
        errors.pincode = pincodeError;
    }

    return errors;
};

/* -------------------------------------------------------------------------- */
/* Validation Result                                                          */
/* -------------------------------------------------------------------------- */

export const hasValidationErrors = (
    errors: OrganizationValidationErrors
): boolean => {
    return Object.keys(errors).length > 0;
};

/* -------------------------------------------------------------------------- */
/* Merge Nested Errors                                                        */
/* -------------------------------------------------------------------------- */

export const addAddressValidationErrors = (
    errors: OrganizationValidationErrors,
    addressErrors: OrganizationValidationErrors
): OrganizationValidationErrors => {
    const result = {
        ...errors,
    };

    Object.entries(addressErrors).forEach(
        ([field, message]) => {
            result[`address.${field}`] =
                message;
        }
    );

    return result;
};