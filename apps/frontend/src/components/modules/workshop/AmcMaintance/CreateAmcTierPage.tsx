"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";

import OrganizationFormLayout from "@/components/common/OrganizationFormLayout";
import Button from "@/components/ui/GrubpacButton";
import {
  FormFieldInlineError,
  mergeFormControlBorderClass,
} from "@/components/ui/form-field-inline-error";
import { RestrictedInput } from "@/components/ui/RestrictedInput";
import { ApiClientError } from "@/lib/api/client";
import { createWorkshopAmcTierApi } from "@/lib/api/workshop/amc";
import { WORKSHOP_INPUT_LIMITS } from "@/lib/forms/restricted-input";
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
  const { token, organizationId, permissions } = useAuth();
  const canCreate =
    permissions.has("workshop.create") ||
    permissions.has("workshop.manage");

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [priceDisplayLabel, setPriceDisplayLabel] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const createMutation = useMutation({
    mutationFn: () =>
      createWorkshopAmcTierApi(token!, {
        organizationId: organizationId!,
        name: name.trim(),
        description: description.trim() || undefined,
        priceDisplayLabel: priceDisplayLabel.trim() || undefined,
      }),
    onSuccess: (data) => {
      showSuccessToast(`${data.name} was created`);
      router.push(workshopAmcTierDetailHref(data.id));
    },
    onError: (error: Error) => {
      const message =
        error instanceof ApiClientError
          ? error.message
          : "Could not create AMC tier. Try again.";
      showErrorToast(message);
    },
  });

  const canSubmit =
    canCreate && !!name.trim() && !createMutation.isPending;

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (!name.trim()) nextErrors.name = "Tier name is required.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    if (!token || !organizationId || !canCreate) {
      showErrorToast("You do not have permission to create AMC tiers.");
      return;
    }
    createMutation.mutate();
  };

  return (
    <OrganizationFormLayout
      title="Create AMC tier"
      description="Define a maintenance contract plan for fleet vehicles."
      backLink={{
        label: "Back to AMC & Maintenance",
        href: workshopAmcMaintenanceListHref,
      }}
      contentVariant="plain"
    >
      <form onSubmit={handleSubmit} className="w-full">
        <section className="overflow-hidden rounded-lg border border-gray-200 bg-white p-4">
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-700">
                Tier name <span className="text-red-500">*</span>
              </label>
              <RestrictedInput
                restrictedKind="name"
                value={name}
                onChange={(value) => {
                  setName(value);
                  setErrors((prev) => ({ ...prev, name: "" }));
                }}
                maxLength={WORKSHOP_INPUT_LIMITS.amcTierName}
                placeholder="e.g. Gold AMC"
                className={mergeFormControlBorderClass(
                  !!errors.name,
                  inputClass,
                )}
              />
              <FormFieldInlineError message={errors.name} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-700">
                Plan details
              </label>
              <RestrictedInput
                restrictedKind="text"
                value={description}
                onChange={(value) => setDescription(value)}
                maxLength={WORKSHOP_INPUT_LIMITS.amcTierDescription}
                placeholder="Coverage summary (optional)"
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-700">
                Price label
              </label>
              <RestrictedInput
                restrictedKind="text"
                value={priceDisplayLabel}
                onChange={(value) => setPriceDisplayLabel(value)}
                maxLength={WORKSHOP_INPUT_LIMITS.amcTierPriceLabel}
                placeholder="e.g. ₹12,000 / year (optional)"
                className={inputClass}
              />
            </div>
          </div>
        </section>

        <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.push(workshopAmcMaintenanceListHref)}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={!canSubmit}>
            {createMutation.isPending ? "Saving…" : "Save tier"}
          </Button>
        </div>
      </form>
    </OrganizationFormLayout>
  );
}
