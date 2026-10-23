"use client";

import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Plus, Trash2 } from "lucide-react";

import { RestrictedInput } from "@/components/ui/RestrictedInput";
import { useGrubpacAuth } from "@/lib/auth-context";
import {
    createFleetClient,
    type FleetClientDetail,
} from "@/lib/api/lease-contracts";
import { FLEET_CLIENT_INPUT_LIMITS } from "@/lib/forms/restricted-input";
import { getInternationalPhonePlaceholder } from "@/lib/geo/placeholders";
import { normalizePhoneForApi } from "@/lib/format/phone-format";
import { showErrorToast } from "@/lib/toast/show-toast";

import {
    validateRequired,
    validateEmail,
    validatePhone,
    hasValidationErrors,
    type ValidationErrors,
} from "@/components/common/Commonvalidation";

import FormActions from "@/components/common/FormActions";

interface PointOfContact {
    id: string;
    name: string;
    contactNumber: string;
    email: string;
    isPrimary: boolean;
}

interface CustomerRegistrationFormProps {
    initialCompanyName?: string;
    /** May perform async wizard steps; stay pending until settled. */
    onSuccess?: (customer: FleetClientDetail) => void | Promise<void>;
    onCancel?: () => void;
}

function createContactId(): string {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
        return crypto.randomUUID();
    }

    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function emptyPoc(isPrimary: boolean): PointOfContact {
    return {
        id: createContactId(),
        name: "",
        contactNumber: "",
        email: "",
        isPrimary,
    };
}

export default function CustomerRegistrationForm({
    initialCompanyName = "",
    onSuccess,
    onCancel,
}: CustomerRegistrationFormProps) {
    const { token, organizationId } = useGrubpacAuth();

    const [companyName, setCompanyName] = useState(
        initialCompanyName.trim(),
    );
    const [taxId, setTaxId] = useState("");
    const [pointsOfContact, setPointsOfContact] = useState<
        PointOfContact[]
    >([emptyPoc(true)]);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    const phonePlaceholder = getInternationalPhonePlaceholder();

    /**
     * Derive all field errors from the shared validators.
     * Contact IDs keep each error associated with its own row.
     */
    const validationErrors = useMemo(() => {
        const errors: ValidationErrors = {};

        const companyNameError = validateRequired(
            companyName,
            "Client name",
        );

        if (companyNameError) {
            errors.companyName = companyNameError;
        }

        if (pointsOfContact.length === 0) {
            errors.pointsOfContact =
                "At least one point of contact is required.";
        }

        const primaryCount = pointsOfContact.filter(
            (contact) => contact.isPrimary,
        ).length;

        if (primaryCount !== 1) {
            errors.primaryContact =
                "Exactly one point of contact must be marked as primary.";
        }

        pointsOfContact.forEach((contact, index) => {
            const prefix = `contact.${contact.id}`;
            const label = `Point of contact ${index + 1}`;

            const nameError = validateRequired(
                contact.name,
                `${label} name`,
            );

            if (nameError) {
                errors[`${prefix}.name`] = nameError;
            }

            const phoneError = validatePhone(
                contact.contactNumber,
                `${label} contact number`,
            );

            if (phoneError) {
                errors[`${prefix}.contactNumber`] = phoneError;
            }

            const emailError = validateEmail(
                contact.email,
                `${label} email`,
            );

            if (emailError) {
                errors[`${prefix}.email`] = emailError;
            }
        });

        return errors;
    }, [companyName, pointsOfContact]);

    const validationSummary = useMemo(
        () => Object.values(validationErrors),
        [validationErrors],
    );

    const canSubmit = !hasValidationErrors(validationErrors);

    const getFieldError = (key: string): string | undefined =>
        hasAttemptedSubmit ? validationErrors[key] : undefined;

    const fieldErrorClass = (key: string) =>
        getFieldError(key)
            ? "border-red-500 focus:border-red-500 focus:ring-red-100"
            : "";

    const clearFormError = () => {
        setFormError(null);
    };

    const addContact = () => {
        clearFormError();

        setPointsOfContact((previous) => [
            ...previous,
            emptyPoc(false),
        ]);
    };

    const removeContact = (id: string) => {
        if (pointsOfContact.length === 1) {
            setFormError("At least one point of contact is required.");
            return;
        }

        const contactToRemove = pointsOfContact.find(
            (contact) => contact.id === id,
        );

        const remainingContacts = pointsOfContact.filter(
            (contact) => contact.id !== id,
        );

        if (contactToRemove?.isPrimary && remainingContacts.length > 0) {
            remainingContacts[0] = {
                ...remainingContacts[0],
                isPrimary: true,
            };
        }

        setPointsOfContact(remainingContacts);
        clearFormError();
    };

    const updateContact = (
        id: string,
        patch: Partial<PointOfContact>,
    ) => {
        clearFormError();

        setPointsOfContact((previous) =>
            previous.map((contact) =>
                contact.id === id
                    ? { ...contact, ...patch }
                    : contact,
            ),
        );
    };

    const setPrimaryContact = (id: string) => {
        clearFormError();

        setPointsOfContact((previous) =>
            previous.map((contact) => ({
                ...contact,
                isPrimary: contact.id === id,
            })),
        );
    };

    const handleSubmit = async (
        event: FormEvent<HTMLFormElement>,
    ) => {
        event.preventDefault();

        if (isSubmitting) return;

        setHasAttemptedSubmit(true);
        setFormError(null);

        if (!token || !organizationId) {
            setFormError(
                "Authentication or organization information is missing.",
            );
            return;
        }

        if (!canSubmit) {
            return;
        }

        setIsSubmitting(true);

        try {
            const created = await createFleetClient(
                token,
                organizationId,
                {
                    companyName: companyName.trim(),
                    taxId: taxId.trim() || undefined,
                    pointsOfContact: pointsOfContact.map((contact) => ({
                        name: contact.name.trim(),
                        contactNumber: normalizePhoneForApi(
                            contact.contactNumber,
                        ),
                        email: contact.email.trim().toLowerCase(),
                        isPrimary: contact.isPrimary,
                    })),
                },
            );

            await onSuccess?.(created);
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : "Failed to create client.";

            setFormError(message);
            showErrorToast(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form
            id="customer-registration-form"
            onSubmit={handleSubmit}
            className="w-full"
            noValidate
        >
            <section className="overflow-hidden rounded-lg border border-gray-200 bg-white">
                <div className="px-4 py-4 sm:px-5">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                            <label
                                htmlFor="lease-client-company-name"
                                className="block text-xs font-semibold text-slate-700"
                            >
                                Client name *
                            </label>

                            <RestrictedInput
                                id="lease-client-company-name"
                                restrictedKind="name"
                                maxLength={FLEET_CLIENT_INPUT_LIMITS.companyName}
                                value={companyName}
                                onChange={(value) => {
                                    setCompanyName(value);
                                    clearFormError();
                                }}
                                placeholder="Sunrise Freight Co"
                                aria-invalid={Boolean(
                                    getFieldError("companyName"),
                                )}
                                aria-describedby={
                                    getFieldError("companyName")
                                        ? "lease-client-company-name-error"
                                        : undefined
                                }
                                className={`mt-1.5 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#FE5720] focus:ring-1 focus:ring-[#FE5720]/15 ${fieldErrorClass("companyName")}`}
                            />

                            {getFieldError("companyName") && (
                                <p
                                    id="lease-client-company-name-error"
                                    className="mt-1 text-xs text-red-600"
                                >
                                    {getFieldError("companyName")}
                                </p>
                            )}
                        </div>

                        <div>
                            <label
                                htmlFor="lease-client-tax-id"
                                className="block text-xs font-semibold text-slate-700"
                            >
                                GSTIN / Tax ID{" "}
                                <span className="font-normal text-slate-400">
                                    (optional)
                                </span>
                            </label>

                            <RestrictedInput
                                id="lease-client-tax-id"
                                restrictedKind="text"
                                maxLength={FLEET_CLIENT_INPUT_LIMITS.taxId}
                                value={taxId}
                                onChange={(value) => {
                                    setTaxId(value);
                                    clearFormError();
                                }}
                                placeholder="Optional"
                                className="mt-1.5 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#FE5720] focus:ring-1 focus:ring-[#FE5720]/15"
                            />
                        </div>
                    </div>
                </div>

                <div className="border-t border-slate-100 px-4 py-4 sm:px-5">
                    <div className="mb-2.5 flex items-center justify-between gap-3">
                        <h2 className="text-xs font-semibold text-slate-800 sm:text-sm">
                            Point of contact
                        </h2>
                    </div>

                    {getFieldError("pointsOfContact") && (
                        <p className="mb-2 text-xs text-red-600">
                            {getFieldError("pointsOfContact")}
                        </p>
                    )}

                    {getFieldError("primaryContact") && (
                        <p className="mb-2 text-xs text-red-600">
                            {getFieldError("primaryContact")}
                        </p>
                    )}

                    <div className="overflow-hidden rounded-md border border-slate-200">
                        <div className="hidden grid-cols-[1.15fr_1.15fr_1.15fr_28px] gap-2 border-b border-slate-100 bg-slate-50 px-3 py-2 md:grid">
                            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                                Name
                            </span>
                            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                                Contact number
                            </span>
                            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                                Email
                            </span>
                            <span />
                        </div>

                        <div className="divide-y divide-slate-100">
                            {pointsOfContact.map((contact, index) => {
                                const prefix = `contact.${contact.id}`;

                                return (
                                    <div
                                        key={contact.id}
                                        className="px-3 py-3"
                                    >
                                        <div className="mb-2 flex items-center justify-between md:hidden">
                                            <span className="text-xs font-semibold text-slate-700">
                                                Point of contact {index + 1}
                                            </span>

                                            {pointsOfContact.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        removeContact(contact.id)
                                                    }
                                                    className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-500"
                                                    aria-label={`Remove point of contact ${index + 1}`}
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </button>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1.15fr_1.15fr_1.15fr_28px] md:items-start md:gap-2">
                                            <div>
                                                <label className="mb-1 block text-[10px] font-medium text-slate-500 md:hidden">
                                                    Name
                                                </label>

                                                <RestrictedInput
                                                    restrictedKind="name"
                                                    maxLength={FLEET_CLIENT_INPUT_LIMITS.pocName}
                                                    value={contact.name}
                                                    onChange={(name) =>
                                                        updateContact(contact.id, {
                                                            name,
                                                        })
                                                    }
                                                    placeholder="Arjun Mehta"
                                                    aria-invalid={Boolean(
                                                        getFieldError(
                                                            `${prefix}.name`,
                                                        ),
                                                    )}
                                                    className={`h-9 w-full rounded-md border border-slate-300 bg-white px-2.5 text-xs text-slate-800 outline-none placeholder:text-slate-400 focus:border-[#FE5720] focus:ring-1 focus:ring-[#FE5720]/15 sm:text-sm ${fieldErrorClass(`${prefix}.name`)}`}
                                                />

                                                {getFieldError(`${prefix}.name`) && (
                                                    <p className="mt-1 text-xs text-red-600">
                                                        {getFieldError(`${prefix}.name`)}
                                                    </p>
                                                )}
                                            </div>

                                            <div>
                                                <label className="mb-1 block text-[10px] font-medium text-slate-500 md:hidden">
                                                    Contact number
                                                </label>

                                                <RestrictedInput
                                                    restrictedKind="phone"
                                                    maxLength={FLEET_CLIENT_INPUT_LIMITS.pocPhone}
                                                    value={contact.contactNumber}
                                                    onChange={(contactNumber) =>
                                                        updateContact(contact.id, {
                                                            contactNumber,
                                                        })
                                                    }
                                                    placeholder={phonePlaceholder}
                                                    aria-invalid={Boolean(
                                                        getFieldError(
                                                            `${prefix}.contactNumber`,
                                                        ),
                                                    )}
                                                    className={`h-9 w-full rounded-md border border-slate-300 bg-white px-2.5 text-xs text-slate-800 outline-none placeholder:text-slate-400 focus:border-[#FE5720] focus:ring-1 focus:ring-[#FE5720]/15 sm:text-sm ${fieldErrorClass(`${prefix}.contactNumber`)}`}
                                                />

                                                {getFieldError(
                                                    `${prefix}.contactNumber`,
                                                ) && (
                                                        <p className="mt-1 text-xs text-red-600">
                                                            {getFieldError(
                                                                `${prefix}.contactNumber`,
                                                            )}
                                                        </p>
                                                    )}
                                            </div>

                                            <div>
                                                <label className="mb-1 block text-[10px] font-medium text-slate-500 md:hidden">
                                                    Email
                                                </label>

                                                <RestrictedInput
                                                    restrictedKind="email"
                                                    maxLength={FLEET_CLIENT_INPUT_LIMITS.pocEmail}
                                                    value={contact.email}
                                                    onChange={(email) =>
                                                        updateContact(contact.id, {
                                                            email,
                                                        })
                                                    }
                                                    placeholder="name@company.com"
                                                    aria-invalid={Boolean(
                                                        getFieldError(
                                                            `${prefix}.email`,
                                                        ),
                                                    )}
                                                    className={`h-9 w-full rounded-md border border-slate-300 bg-white px-2.5 text-xs text-slate-800 outline-none placeholder:text-slate-400 focus:border-[#FE5720] focus:ring-1 focus:ring-[#FE5720]/15 sm:text-sm ${fieldErrorClass(`${prefix}.email`)}`}
                                                />

                                                {getFieldError(`${prefix}.email`) && (
                                                    <p className="mt-1 text-xs text-red-600">
                                                        {getFieldError(`${prefix}.email`)}
                                                    </p>
                                                )}
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    removeContact(contact.id)
                                                }
                                                disabled={pointsOfContact.length === 1}
                                                className="hidden h-8 w-7 items-center justify-center self-center rounded-md text-slate-400 transition hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-30 md:flex"
                                                title="Remove contact"
                                                aria-label={`Remove point of contact ${index + 1}`}
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        </div>

                                        {pointsOfContact.length > 1 && (
                                            <label className="mt-2.5 inline-flex cursor-pointer items-center gap-2">
                                                <input
                                                    type="radio"
                                                    name="primaryContact"
                                                    checked={contact.isPrimary}
                                                    onChange={() =>
                                                        setPrimaryContact(contact.id)
                                                    }
                                                    className="h-3.5 w-3.5 accent-[#FE5720]"
                                                />

                                                <span className="text-[11px] font-medium text-slate-600">
                                                    Primary POC
                                                </span>
                                            </label>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={addContact}
                        className="mt-2.5 inline-flex items-center gap-1 text-xs font-semibold text-[#FE5720] hover:underline"
                    >
                        <Plus className="h-3.5 w-3.5" />
                        Add another POC
                    </button>
                </div>

                {formError && (
                    <div
                        className="border-t border-red-100 bg-red-50 px-4 py-2.5 sm:px-5"
                        role="alert"
                    >
                        <p className="text-xs font-medium text-red-600">
                            {formError}
                        </p>
                    </div>
                )}
                <div className="border-t border-slate-100 px-4 py-3 sm:px-5">
                    <div className="w-full text-left">
                        <FormActions
                            hasAttemptedSubmit={hasAttemptedSubmit}
                            validationSummary={validationSummary}
                            isSaving={isSubmitting}
                            canSubmit={canSubmit && !isSubmitting}
                            onCancel={() => onCancel?.()}
                            onSave={() => {
                                document
                                    .getElementById("customer-registration-form")
                                    ?.dispatchEvent(
                                        new Event("submit", {
                                            bubbles: true,
                                            cancelable: true,
                                        }),
                                    );
                            }}
                            saveLabel="Save & continue"
                            savingLabel="Saving..."
                        />
                    </div>
                </div>
            </section>

            <div className="mt-4 rounded-lg border border-slate-200 bg-white px-4 py-3 sm:px-5">
                <p className="text-[11px] leading-5 text-slate-500 sm:text-xs">
                    A client can carry several POCs, each with their own name,
                    contact number and email; exactly one is marked Primary. This is
                    the same shared Customer/Client Register used across Organisation
                    and every lease contract.
                </p>
            </div>
        </form>
    );
}
