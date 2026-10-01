"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Info, Mail, Smartphone, type LucideIcon } from "lucide-react";

import Button from "@/components/ui/GrubpacButton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ReasonRequiredDialog } from "@/components/ui/reason-required-dialog";
import ContactCopyIcon from "@/components/ui/ContactCopyIcon";
import { DashboardSubpageHeader } from "@/components/dashboard/DashboardSubpageHeader";
import { useAuth } from "@/providers/auth-provider";
import { formatStructuredAddressMultiline } from "@/lib/format/address-format";
import {
  formatPhoneDisplay,
  isPhoneValueEmpty,
} from "@/lib/format/phone-format";
import { ApiClientError } from "@/lib/api/client";
import {
  fetchOrganisationClientByIdApi,
  mapClientDetailToRecord,
  organisationClientsQueryKey,
  updateOrganisationClientStatusApi,
  type OrganisationClientContractStatus,
  type OrganisationClientRecord,
} from "@/lib/api/organisation/clients";
import {
  CLIENT_STATUS_UPDATE_ERROR,
  showClientActivatedToast,
  showClientDeactivatedToast,
  showErrorToast,
} from "@/lib/toast/show-toast";

function ClientDetailChrome({
  breadcrumbName,
  children,
}: {
  breadcrumbName?: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#f7f7f7]">
      <DashboardSubpageHeader
        backHref="/organization/clients"
        backLabel="Back to clients"
        currentLabel={breadcrumbName}
      />
      {children}
    </div>
  );
}

function contractStatusPillClass(status: OrganisationClientContractStatus): string {
  switch (status) {
    case "active":
      return "bg-green-50 text-green-700";
    case "draft":
      return "bg-gray-100 text-gray-600";
    case "completed":
      return "bg-blue-50 text-blue-700";
    case "cancelled":
      return "bg-red-50 text-red-600";
    default:
      return "bg-gray-100 text-gray-600";
  }
}

function contractStatusLabel(status: OrganisationClientContractStatus): string {
  switch (status) {
    case "active":
      return "Active";
    case "draft":
      return "Draft";
    case "completed":
      return "Completed";
    case "cancelled":
      return "Cancelled";
    default:
      return status;
  }
}

function PocContactCell({
  display,
  copyValue,
  label,
  icon,
  copyKind = "plain",
}: {
  display: string;
  copyValue: string;
  label: string;
  icon: LucideIcon;
  copyKind?: "phone" | "plain";
}) {
  const isEmpty =
    copyKind === "phone"
      ? isPhoneValueEmpty(copyValue)
      : !copyValue?.trim();

  if (isEmpty) {
    return <span className="text-sm text-gray-400">—</span>;
  }

  return (
    <div className="flex min-w-0 items-center gap-2">
      <span className="truncate text-sm text-gray-700">{display}</span>
      <ContactCopyIcon
        value={copyValue}
        label={label}
        icon={icon}
        copyKind={copyKind}
      />
    </div>
  );
}

function formatContractStartDate(isoDate: string): string {
  const parsed = Date.parse(`${isoDate}T00:00:00`);
  if (Number.isNaN(parsed)) {
    return isoDate;
  }
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(parsed));
}

export default function ClientViewPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const clientId = String(params.id);

  const {
    token,
    organizationId,
    isLoading: isAuthLoading,
    permissions,
  } = useAuth();

  const canUpdate =
    permissions.has("organisation.update") ||
    permissions.has("organisation.manage");

  const [deactivateOpen, setDeactivateOpen] = useState(false);
  const [activateOpen, setActivateOpen] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  const clientQuery = useQuery({
    queryKey: [...organisationClientsQueryKey(organizationId ?? ""), "detail", clientId],
    queryFn: async () => {
      if (!token || !organizationId) {
        throw new Error("Organization context is required.");
      }
      const detail = await fetchOrganisationClientByIdApi(
        token,
        organizationId,
        clientId,
      );
      return mapClientDetailToRecord(detail);
    },
    enabled: !!token && !!organizationId && !isAuthLoading,
  });

  const statusMutation = useMutation({
    mutationFn: async (input: {
      action: "activate" | "deactivate";
      reason?: string;
    }) => {
      if (!token || !organizationId) {
        throw new Error("Organization context is required.");
      }
      const detail = await updateOrganisationClientStatusApi(
        token,
        organizationId,
        clientId,
        {
          action: input.action,
          reason: input.reason,
        },
      );
      return mapClientDetailToRecord(detail);
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({
        queryKey: organisationClientsQueryKey(organizationId ?? ""),
      });
      setDeactivateOpen(false);
      setActivateOpen(false);
      setStatusError(null);
      if (data.status === "active") {
        showClientActivatedToast(data.clientName);
      } else {
        showClientDeactivatedToast(data.clientName);
      }
    },
    onError: (error: unknown) => {
      const message =
        error instanceof ApiClientError
          ? error.message
          : error instanceof Error
            ? error.message
            : CLIENT_STATUS_UPDATE_ERROR;
      setStatusError(message);
      showErrorToast(message);
    },
  });

  const client = clientQuery.data;

  if (clientQuery.isLoading || isAuthLoading) {
    return (
      <ClientDetailChrome>
        <main className="px-6 py-8">
          <div
            className="h-40 animate-pulse rounded-lg bg-gray-200"
            aria-busy="true"
          />
        </main>
      </ClientDetailChrome>
    );
  }

  if (clientQuery.isError || !client) {
    return (
      <ClientDetailChrome>
        <main className="px-6 py-8">
          <p className="text-sm text-red-600" role="alert">
            {clientQuery.error instanceof Error
              ? clientQuery.error.message
              : "Client not found."}
          </p>
          <button
            type="button"
            onClick={() => clientQuery.refetch()}
            className="mt-3 text-sm font-medium text-[#FE5720] hover:underline"
          >
            Retry
          </button>
        </main>
      </ClientDetailChrome>
    );
  }

  return (
    <>
      <ClientDetailChrome breadcrumbName={client.clientName}>
        <main className="px-6 py-3 pb-8">
          <ClientDetailBody
            client={client}
            canUpdate={canUpdate}
            onEdit={() =>
              router.push(`/organization/clients/${client.id}/edit`)
            }
            onDeactivate={() => {
              setStatusError(null);
              setDeactivateOpen(true);
            }}
            onActivate={() => {
              setStatusError(null);
              setActivateOpen(true);
            }}
          />
        </main>
      </ClientDetailChrome>

      <ConfirmDialog
        open={activateOpen}
        title="Activate client?"
        message={`${client.clientName} will be marked active in the client register.`}
        confirmLabel="Activate"
        isConfirmPending={statusMutation.isPending}
        onClose={() => {
          if (!statusMutation.isPending) {
            setActivateOpen(false);
            setStatusError(null);
          }
        }}
        onConfirm={async () => {
          await statusMutation.mutateAsync({ action: "activate" });
        }}
      />

      <ReasonRequiredDialog
        open={deactivateOpen}
        title="Deactivate client?"
        description={
          <>
            <span className="font-medium text-gray-900">{client.clientName}</span>{" "}
            will be marked inactive. Provide a reason — it is recorded in the
            audit log.
          </>
        }
        reasonLabel="Reason for deactivation"
        reasonPlaceholder="Reason for deactivation"
        confirmLabel="Deactivate"
        pendingLabel="Deactivating..."
        isPending={statusMutation.isPending}
        error={statusError}
        onClose={() => {
          setDeactivateOpen(false);
          setStatusError(null);
        }}
        onConfirm={(reason) => {
          void statusMutation.mutateAsync({ action: "deactivate", reason });
        }}
      />
    </>
  );
}

function ClientDetailBody({
  client,
  canUpdate,
  onEdit,
  onDeactivate,
  onActivate,
}: {
  client: OrganisationClientRecord;
  canUpdate: boolean;
  onEdit: () => void;
  onDeactivate: () => void;
  onActivate: () => void;
}) {
  const isActive = client.status === "active";
  const showPrimaryBadge = client.pointsOfContact.length > 1;
  const addressDisplay = formatStructuredAddressMultiline({
    addressLine1: client.address.line1,
    addressLine2: client.address.line2,
    addressCity: client.address.city,
    addressDistrict: client.address.district,
    addressState: client.address.state,
    addressPincode: client.address.pincode,
    addressCountry: client.address.country,
  });

  return (
    <>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-semibold text-gray-900">
            {client.clientName}
          </h1>
          {isActive ? (
            <span className="rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-medium text-green-700">
              Active
            </span>
          ) : (
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">
              Inactive
            </span>
          )}
        </div>

        {canUpdate ? (
          <div className="flex shrink-0 items-center gap-2">
            {isActive ? (
              <>
                <Button
                  type="button"
                  variant="neutral"
                  onClick={onEdit}
                  className="h-9 border-gray-300 bg-white px-5 text-gray-700 hover:bg-gray-50"
                >
                  Edit
                </Button>
                <Button
                  type="button"
                  variant="neutral"
                  onClick={onDeactivate}
                  className="h-9 border-red-500 bg-white px-5 text-red-600 hover:bg-red-50"
                >
                  Deactivate
                </Button>
              </>
            ) : (
              <Button
                type="button"
                variant="neutral"
                onClick={onActivate}
                className="h-9 border-gray-300 bg-white px-5 text-gray-700 hover:bg-gray-50"
              >
                Activate
              </Button>
            )}
          </div>
        ) : null}
      </div>

      <div className="mb-4 rounded-lg border border-gray-200 bg-white px-4 py-3">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
              Address
            </p>
            <p className="mt-1 whitespace-pre-line text-sm text-gray-800">
              {addressDisplay}
            </p>
          </div>
          <div className="shrink-0 sm:border-l sm:border-gray-100 sm:pl-6">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
              Total contracts
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-gray-900">
              {client.contracts.length}
            </p>
          </div>
        </div>
      </div>

      <section className="mb-4">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-700">
          Points of contact
        </h2>
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <div className="hidden grid-cols-[1.2fr_1fr_1.2fr_100px] gap-2 border-b border-gray-100 bg-gray-50 px-3 py-2 md:grid">
            <span className="text-[10px] font-semibold uppercase text-gray-500">
              Name
            </span>
            <span className="text-[10px] font-semibold uppercase text-gray-500">
              Contact number
            </span>
            <span className="text-[10px] font-semibold uppercase text-gray-500">
              Email
            </span>
            <span />
          </div>
          <div className="divide-y divide-gray-100">
            {client.pointsOfContact.map((poc) => (
              <div
                key={poc.id}
                className="grid grid-cols-1 gap-2 px-3 py-3 md:grid-cols-[1.2fr_1fr_1.2fr_100px] md:items-center"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">
                    {poc.name}
                  </span>
                  {showPrimaryBadge && poc.isPrimary ? (
                    <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-medium text-[#FE5720]">
                      Primary
                    </span>
                  ) : null}
                </div>
                <PocContactCell
                  display={
                    formatPhoneDisplay(poc.contactNumber) ||
                    poc.contactNumber ||
                    "—"
                  }
                  copyValue={poc.contactNumber}
                  label="mobile number"
                  icon={Smartphone}
                  copyKind="phone"
                />
                <PocContactCell
                  display={poc.email.trim() || "—"}
                  copyValue={poc.email}
                  label="email"
                  icon={Mail}
                />
                <span className="hidden md:block" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-700">
          Contract history
        </h2>
        {client.contracts.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-200 bg-white px-4 py-8 text-center">
            <p className="text-sm text-gray-500">
              No contracts yet for this client.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
            <div className="hidden grid-cols-[1fr_1.4fr_120px_100px] gap-2 border-b border-gray-100 bg-gray-50 px-3 py-2 md:grid">
              <span className="text-[10px] font-semibold uppercase text-gray-500">
                Contract ID
              </span>
              <span className="text-[10px] font-semibold uppercase text-gray-500">
                Asset classes
              </span>
              <span className="text-[10px] font-semibold uppercase text-gray-500">
                Start date
              </span>
              <span className="text-[10px] font-semibold uppercase text-gray-500">
                Status
              </span>
            </div>
            <div className="divide-y divide-gray-100">
              {client.contracts.map((contract) => (
                <div
                  key={contract.id}
                  className="grid grid-cols-1 gap-2 px-3 py-3 md:grid-cols-[1fr_1.4fr_120px_100px] md:items-center"
                >
                  <span className="text-sm font-medium text-gray-900">
                    {contract.id}
                  </span>
                  <span className="text-sm text-gray-700">
                    {contract.assetClasses}
                  </span>
                  <span className="text-sm text-gray-700">
                    {formatContractStartDate(contract.startDate)}
                  </span>
                  <span
                    className={[
                      "inline-flex w-fit rounded-full px-2.5 py-0.5 text-xs font-medium",
                      contractStatusPillClass(contract.status),
                    ].join(" ")}
                  >
                    {contractStatusLabel(contract.status)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {client.contracts.length === 0 ? (
        <div className="mt-4 flex gap-2 rounded-lg border border-blue-100 bg-blue-50/80 px-3 py-2.5">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" aria-hidden />
          <p className="text-xs text-blue-900">
            Contract history will list lease contracts once this register is
            linked to Fleet leasing. New lease flows still use the fleet client
            register until that cross-module link ships.
          </p>
        </div>
      ) : null}
    </>
  );
}
