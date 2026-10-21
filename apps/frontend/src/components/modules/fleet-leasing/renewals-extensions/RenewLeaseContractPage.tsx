"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Info } from "lucide-react";

import OrganizationFormLayout from "@/components/common/OrganizationFormLayout";
import DetailField from "@/components/common/DetailField";
import OrganizationDetailCard, {
  OrganizationDetailFieldGrid,
} from "@/components/common/OrganizationDetailCard";
import Button from "@/components/ui/GrubpacButton";
import { RestrictedInput } from "@/components/ui/RestrictedInput";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { formatCalendarDateEnIn } from "@/lib/format/date-format";
import { formatIndianRupee } from "@/lib/format/currency-format";
import { FLEET_LEASE_TERMS_INPUT_LIMITS } from "@/lib/forms/restricted-input";
import { useLeaseApi } from "@/lib/api/lease-contracts-context";
import { RENEWAL_TERM_THRESHOLD_MONTHS } from "@/lib/lease-contract/renew-outcome";
import { useAuth } from "@/providers/auth-provider";
import { dashboardListQueryOptions } from "@/lib/query/dashboard-list-query-options";
import {
  LEASE_CONTRACT_RENEW_ERROR,
  showErrorToast,
  showLeaseContractExtendedToast,
  showLeaseContractRenewedToast,
} from "@/lib/toast/show-toast";
import { ApiClientError } from "@/lib/api/client";
import { fleetLeaseContractDetailHref } from "@/lib/navigation/fleet-static-routes";
import { useFleetEntityId } from "@/lib/navigation/use-fleet-entity-id";
import FormActions from "@/components/common/FormActions";
import {
  validateRequired,
  validateNumber,
  validateDate,
  hasValidationErrors,
  type ValidationErrors,
} from "@/components/common/Commonvalidation";

const INPUT_LABEL =
  "mb-1.5 block text-sm font-medium text-gray-700";

const SECTION_TITLE =
  "mb-4 text-xs font-semibold uppercase tracking-wider text-slate-500";

const FIELD_ERROR_CLASS =
  "mt-1 text-xs leading-5 text-red-600";

export default function RenewLeaseContractPage() {
  const router = useRouter();
  const leaseId = useFleetEntityId("leaseId");
  const queryClient = useQueryClient();
  const { permissions, isLoading: isAuthLoading } = useAuth();
  const { api, organizationId } = useLeaseApi();

  const canRenew =
    permissions.has("fleet_leasing.update") ||
    permissions.has("fleet_leasing.manage");

  const [newTermMonths, setNewTermMonths] = useState("");
  const [newStartDate, setNewStartDate] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);


  const detailQuery = useQuery({
    queryKey: ["lease-contract", leaseId, organizationId],
    queryFn: () => api.getById(leaseId),
    enabled: !!organizationId && !!leaseId && !isAuthLoading,
    ...dashboardListQueryOptions,
  });

  const detail = detailQuery.data;

  const parsedTermMonths = useMemo(() => {
    const trimmed = newTermMonths.trim();

    if (!trimmed) return null;

    const value = Number(trimmed);

    if (!Number.isInteger(value) || value < 1) {
      return null;
    }

    return value;
  }, [newTermMonths]);

  const outcomePreview =
    parsedTermMonths != null
      ? parsedTermMonths >= RENEWAL_TERM_THRESHOLD_MONTHS
        ? "Renewal"
        : "Extension"
      : null;

  const validationErrors = useMemo<ValidationErrors>(() => {
    const errors: ValidationErrors = {};

    const termRequiredError = validateRequired(
      newTermMonths,
      "New term (months)",
    );

    if (termRequiredError) {
      errors.newTermMonths = termRequiredError;
    } else {
      const termError = validateNumber(newTermMonths, {
        label: "New term (months)",
        required: true,
        min: 1,
        integer: true,
      });

      if (termError) {
        errors.newTermMonths = termError;
      }
    }

    const startDateRequiredError = validateRequired(
      newStartDate,
      "New start date",
    );

    if (startDateRequiredError) {
      errors.newStartDate = startDateRequiredError;
    } else {
      const startDateError = validateDate(newStartDate, {
        label: "New start date",
        required: true,
      });

      if (startDateError) {
        errors.newStartDate = startDateError;
      }
    }

    return errors;
  }, [newTermMonths, newStartDate]);

  const validationSummary = useMemo(
    () => Object.values(validationErrors),
    [validationErrors],
  );

  const isFormValid = !hasValidationErrors(validationErrors);

  const getFieldError = (field: string) =>
    hasAttemptedSubmit ? validationErrors[field] : undefined;

  const depositDisplay = useMemo(() => {
    if (detail?.securityDeposit == null) return "—";

    const amount =
      typeof detail.securityDeposit === "string"
        ? Number.parseFloat(detail.securityDeposit)
        : detail.securityDeposit;

    return formatIndianRupee(amount);
  }, [detail?.securityDeposit]);

  const currentTermDisplay = useMemo(() => {
    if (!detail) return "—";

    const months =
      detail.termMonths != null
        ? `${detail.termMonths} month${detail.termMonths === 1 ? "" : "s"}`
        : "—";

    const start = detail.startDate
      ? ` · Start ${formatCalendarDateEnIn(detail.startDate)}`
      : "";

    return `${months}${start}`;
  }, [detail]);

  const renewMutation = useMutation({
    mutationFn: () => {
      if (parsedTermMonths == null) {
        throw new Error("Enter a valid new term.");
      }

      return api.renew(leaseId, {
        newTermMonths: parsedTermMonths,
        newStartDate: newStartDate.trim(),
      });
    },

    onSuccess: (data) => {
      void queryClient.invalidateQueries({
        queryKey: ["renewals-extensions-list", organizationId],
      });

      void queryClient.invalidateQueries({
        queryKey: ["lease-contracts-list", organizationId],
      });

      void queryClient.invalidateQueries({
        queryKey: ["lease-contract", leaseId, organizationId],
      });

      if (data.outcomeKind === "extension") {
        showLeaseContractExtendedToast();
      } else {
        showLeaseContractRenewedToast();
      }

      router.replace(fleetLeaseContractDetailHref(leaseId));
    },

    onError: (error) => {
      const message =
        error instanceof ApiClientError
          ? error.message || LEASE_CONTRACT_RENEW_ERROR
          : error instanceof Error
            ? error.message
            : LEASE_CONTRACT_RENEW_ERROR;

      showErrorToast(message);
    },
  });

  const canSubmit =
    canRenew &&
    isFormValid &&
    !renewMutation.isPending &&
    !detailQuery.isLoading &&
    detail?.rawStatus === "active";

  const handleOpenConfirmation = () => {
    setHasAttemptedSubmit(true);

    if (!canRenew) {
      showErrorToast("You do not have permission to renew this contract.");
      return;
    }

    if (!isFormValid) {
      setConfirmOpen(false);
      return;
    }

    if (
      !detail ||
      detail.rawStatus !== "active" ||
      renewMutation.isPending
    ) {
      return;
    }

    setConfirmOpen(true);
  };

  const handleConfirmRenew = () => {
    if (!canSubmit) {
      setHasAttemptedSubmit(true);
      setConfirmOpen(false);
      return;
    }

    setConfirmOpen(false);
    renewMutation.mutate();
  };

  const footerActions =
    detail && !detailQuery.isLoading ? (
      <FormActions
        hasAttemptedSubmit={hasAttemptedSubmit}
        validationSummary={validationSummary}
        isSaving={renewMutation.isPending}
        canSubmit={
          canRenew &&
          !renewMutation.isPending &&
          detail.rawStatus === "active"
        }
        onCancel={() =>
          router.push("/fleet-leasing/renewals-extensions")
        }
        onSave={handleOpenConfirmation}
        saveLabel="Renew contract"
        savingLabel="Renewing..."
        cancelLabel="Cancel"
      />
    ) : undefined;

  if (!leaseId) {
    return (
      <OrganizationFormLayout title="Renew contract">
        <p className="text-sm text-slate-600">
          Missing contract. Open renew from the Renewals &amp; Extensions list.
        </p>
      </OrganizationFormLayout>
    );
  }

  if (detailQuery.isError) {
    return (
      <OrganizationFormLayout title="Renew contract">
        <p className="text-sm text-red-600">
          Could not load contract.
        </p>
      </OrganizationFormLayout>
    );
  }

  if (detail && detail.rawStatus !== "active") {
    return (
      <OrganizationFormLayout title="Renew contract">
        <p className="text-sm text-slate-600">
          Only active contracts can be renewed or extended.
        </p>
      </OrganizationFormLayout>
    );
  }

  return (
    <>
      <OrganizationFormLayout
        title="Renew contract"
        description="Update the contract term and start date. Security deposit carries forward."
        actions={footerActions}
      >
        {detailQuery.isLoading || !detail ? (
          <p className="text-sm text-slate-500">
            Loading contract…
          </p>
        ) : (
          <div className="space-y-8">


            <OrganizationDetailCard>
              <h2 className={SECTION_TITLE}>Current contract</h2>

              <OrganizationDetailFieldGrid>
                <DetailField
                  label="Client"
                  value={detail.client?.companyName ?? "—"}
                />

                <DetailField
                  label="Current term"
                  value={currentTermDisplay}
                />

                <DetailField
                  label="Security deposit (carries forward)"
                  value={depositDisplay}
                />
              </OrganizationDetailFieldGrid>
            </OrganizationDetailCard>

            <div>
              <h2 className={SECTION_TITLE}>New term</h2>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div>
                  <label
                    htmlFor="renew-term-months"
                    className={INPUT_LABEL}
                  >
                    New term (months){" "}
                    <span className="text-red-500">*</span>
                  </label>

                  <RestrictedInput
                    id="renew-term-months"
                    restrictedKind="digits"
                    maxLength={FLEET_LEASE_TERMS_INPUT_LIMITS.termMonthsMaxDigits}
                    value={newTermMonths}
                    onChange={setNewTermMonths}
                    aria-invalid={Boolean(getFieldError("newTermMonths"))}
                    aria-describedby={
                      getFieldError("newTermMonths")
                        ? "renew-term-months-error"
                        : undefined
                    }
                    className={`h-10 w-full rounded-md border bg-white px-3 text-sm ${getFieldError("newTermMonths")
                        ? "border-red-500"
                        : "border-gray-300"
                      }`}
                  />

                  {getFieldError("newTermMonths") && (
                    <p
                      id="renew-term-months-error"
                      className={FIELD_ERROR_CLASS}
                    >
                      {getFieldError("newTermMonths")}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="renew-start-date"
                    className={INPUT_LABEL}
                  >
                    New start date{" "}
                    <span className="text-red-500">*</span>
                  </label>

                  <input
                    id="renew-start-date"
                    type="date"
                    value={newStartDate}
                    onChange={(event) => {
                      setNewStartDate(event.target.value);
                    }}
                    aria-invalid={Boolean(getFieldError("newStartDate"))}
                    aria-describedby={
                      getFieldError("newStartDate")
                        ? "renew-start-date-error"
                        : undefined
                    }
                    className={`h-10 w-full rounded-md border bg-white px-3 text-sm text-gray-900 ${getFieldError("newStartDate")
                      ? "border-red-500"
                      : "border-gray-300"
                      }`}
                  />

                  {getFieldError("newStartDate") && (
                    <p
                      id="renew-start-date-error"
                      className={FIELD_ERROR_CLASS}
                    >
                      {getFieldError("newStartDate")}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div
              className="flex gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3.5"
              role="note"
            >
              <Info
                className="mt-0.5 h-4 w-4 shrink-0 text-slate-500"
                aria-hidden
              />

              <div className="min-w-0 text-sm text-slate-700">
                <p>
                  {RENEWAL_TERM_THRESHOLD_MONTHS} months or more is recorded as
                  a <span className="font-medium">Renewal</span>. Under{" "}
                  {RENEWAL_TERM_THRESHOLD_MONTHS} months is recorded as an{" "}
                  <span className="font-medium">Extension</span>.
                </p>

                {outcomePreview ? (
                  <p className="mt-2 text-slate-600">
                    With the term you entered, outcome:{" "}
                    <span className="font-medium text-slate-900">
                      {outcomePreview}
                    </span>
                    .
                  </p>
                ) : (
                  <p className="mt-2 text-slate-500">
                    Enter a new term to preview renewal vs extension.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </OrganizationFormLayout>

      <ConfirmDialog
        open={confirmOpen}
        title="Renew contract?"
        message={
          outcomePreview
            ? `Apply a ${outcomePreview.toLowerCase()} with the new term and start date. The contract stays active immediately.`
            : "Apply the new term and start date. The contract stays active immediately."
        }
        confirmLabel="Renew contract"
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleConfirmRenew}
        isConfirmPending={renewMutation.isPending}
        confirmDisabled={!canSubmit}
      />
    </>
  );
}
