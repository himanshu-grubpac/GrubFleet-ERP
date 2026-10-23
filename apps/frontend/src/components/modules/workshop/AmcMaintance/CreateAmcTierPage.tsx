"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import OrganizationFormLayout from "@/components/common/OrganizationFormLayout";
import FormActions from "@/components/common/FormActions";
import {
  validateRequired,
  validateStringLength,
  hasValidationErrors,
  type ValidationErrors,
} from "@/components/common/Commonvalidation";
import {
  FormFieldInlineError,
  mergeFormControlBorderClass,
} from "@/components/ui/form-field-inline-error";
import { RestrictedInput } from "@/components/ui/RestrictedInput";
import { ApiClientError } from "@/lib/api/client";
import { createWorkshopAmcTierApi } from "@/lib/api/workshop/amc";
import { invalidateAmcTierCaches } from "@/lib/query/invalidate-domain-caches";
import { WORKSHOP_INPUT_LIMITS } from "@/lib/forms/restricted-input";
import { parseRupeeInputToMinor } from "@/lib/format/money-format";
import {
  workshopAmcMaintenanceListHref,
  workshopAmcTierDetailHref,
} from "@/lib/navigation/workshop-static-routes";
import {
  showErrorToast,
  showSuccessToast,
} from "@/lib/toast/show-toast";
import { useAuth } from "@/providers/auth-provider";

const inputClass =
  "h-9 w-full rounded-md border border-gray-200 bg-white px-3 text-[14px] text-gray-800 outline-none placeholder:text-gray-400 focus:border-[#FE5720] focus:ring-1 focus:ring-[#FE5720]/20";

export default function CreateAmcTierPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { token, organizationId, permissions } = useAuth();

  const canCreate =
    permissions.has("workshop.create") ||
    permissions.has("workshop.manage");

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [tierPriceInput, setTierPriceInput] = useState("");
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const isSubmittingRef = useRef(false);

  const validationErrors: ValidationErrors = useMemo(() => {
    const errors: ValidationErrors = {};

    const nameError = validateRequired(name, "Tier name");
    if (nameError) {
      errors.name = nameError;
    } else {
      const lengthError = validateStringLength(name, {
        label: "Tier name",
        required: true,
        maxLength: WORKSHOP_INPUT_LIMITS.amcTierName,
      });
      if (lengthError) errors.name = lengthError;
    }

    const descriptionError = validateStringLength(description, {
      label: "Plan details",
      required: false,
      maxLength: WORKSHOP_INPUT_LIMITS.amcTierDescription,
    });
    if (descriptionError) errors.description = descriptionError;

    const trimmedPrice = tierPriceInput.trim();
    if (trimmedPrice) {
      const priceMinor = parseRupeeInputToMinor(trimmedPrice);
      if (priceMinor === null || priceMinor < 0) {
        errors.tierPrice = "Enter a valid price amount.";
      }
    }

    return errors;
  }, [name, description, tierPriceInput]);

  const validationSummary = useMemo(
    () => Object.values(validationErrors).filter(Boolean) as string[],
    [validationErrors],
  );

  const getFieldError = (field: string) =>
    hasAttemptedSubmit ? validationErrors[field] : undefined;

  const createMutation = useMutation({
    mutationFn: () => {
      if (!token || !organizationId) {
        throw new Error("Missing authentication or organization context.");
      }

      const trimmedPrice = tierPriceInput.trim();
      const pricePaise =
        trimmedPrice.length > 0
          ? parseRupeeInputToMinor(trimmedPrice) ?? undefined
          : undefined;

      return createWorkshopAmcTierApi(token, {
        organizationId,
        name: name.trim(),
        description: description.trim() || undefined,
        ...(pricePaise !== undefined ? { pricePaise } : {}),
      });
    },
    onSuccess: (data) => {
      isSubmittingRef.current = false;
      void invalidateAmcTierCaches(queryClient);
      showSuccessToast(`${data.name} was created`);
      router.push(workshopAmcTierDetailHref(data.id));
    },
    onError: (error: Error) => {
      isSubmittingRef.current = false;
      const message =
        error instanceof ApiClientError
          ? error.message
          : "Could not create AMC tier. Try again.";
      showErrorToast(message);
    },
  });

  const handleSave = () => {
    setHasAttemptedSubmit(true);

    if (hasValidationErrors(validationErrors)) return;
    if (isSubmittingRef.current || createMutation.isPending) return;

    if (!token || !organizationId || !canCreate) {
      showErrorToast("You do not have permission to create AMC tiers.");
      return;
    }

    isSubmittingRef.current = true;
    createMutation.mutate();
  };

  const handleCancel = () => {
    router.push(workshopAmcMaintenanceListHref);
  };

  const formActions = (
    <FormActions
      hasAttemptedSubmit={hasAttemptedSubmit}
      validationSummary={validationSummary}
      isSaving={createMutation.isPending}
      canSubmit={
        canCreate &&
        !createMutation.isPending &&
        !hasValidationErrors(validationErrors)
      }
      onCancel={handleCancel}
      onSave={handleSave}
      saveLabel="Save tier"
      savingLabel="Saving..."
    />
  );

  return (
    <OrganizationFormLayout
      title="Create AMC tier"
      description="Define a maintenance contract plan for fleet vehicles."
      contentVariant="plain"
      actions={formActions}
    >
      <form
        className="w-full"
        onSubmit={(event) => {
          event.preventDefault();
          handleSave();
        }}
      >
        <section className="overflow-hidden rounded-lg border border-gray-200 bg-white p-4">
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-700">
                Tier name <span className="text-red-500">*</span>
              </label>
              <RestrictedInput
                restrictedKind="name"
                value={name}
                onChange={setName}
                maxLength={WORKSHOP_INPUT_LIMITS.amcTierName}
                placeholder="e.g. Gold AMC"
                className={mergeFormControlBorderClass(
                  !!getFieldError("name"),
                  inputClass,
                )}
              />
              <FormFieldInlineError message={getFieldError("name")} />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-700">
                Plan details
              </label>
              <RestrictedInput
                restrictedKind="text"
                value={description}
                onChange={setDescription}
                maxLength={WORKSHOP_INPUT_LIMITS.amcTierDescription}
                placeholder="Coverage summary (optional)"
                className={mergeFormControlBorderClass(
                  !!getFieldError("description"),
                  inputClass,
                )}
              />
              <FormFieldInlineError message={getFieldError("description")} />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-700">
                Price (optional)
              </label>
              <RestrictedInput
                restrictedKind="inrRupee"
                value={tierPriceInput}
                onChange={setTierPriceInput}
                placeholder="e.g. 12,000"
                className={mergeFormControlBorderClass(
                  !!getFieldError("tierPrice"),
                  inputClass,
                )}
              />
              <FormFieldInlineError message={getFieldError("tierPrice")} />
            </div>
          </div>
        </section>
      </form>
    </OrganizationFormLayout>
  );
}
