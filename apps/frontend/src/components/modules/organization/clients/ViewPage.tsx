"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Truck } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import Button from "@/components/ui/GrubpacButton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ReasonRequiredDialog } from "@/components/ui/reason-required-dialog";
import { useAuth } from "@/providers/auth-provider";
import { ApiClientError } from "@/lib/api/client";
import { formatPhoneDisplay } from "@/lib/format/phone-format";
import {
  fetchOrganisationClientByIdApi,
  updateOrganisationClientStatusApi,
  type OrganisationClientContract,
} from "@/lib/api/organisation/clients";
import {
  CLIENT_STATUS_UPDATE_ERROR,
  showClientActivatedToast,
  showClientDeactivatedToast,
  showErrorToast,
} from "@/lib/toast/show-toast";

function formatContractStatusLabel(
  status: OrganisationClientContract["status"],
): string {
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

/*
 * ============================================================
 * CLIENT VIEW PAGE
 * ============================================================
 */

export default function ViewPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const {
    token,
    organizationId,
    isLoading: isAuthLoading,
    permissions,
  } = useAuth();

  const clientId = String(params.id);

  const canUpdate =
    permissions.has("organisation.update") ||
    permissions.has("organisation.manage");

  const [deactivateOpen, setDeactivateOpen] = useState(false);
  const [activateOpen, setActivateOpen] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  const clientQuery = useQuery({
    queryKey: ["organization", "client", organizationId, clientId],
    queryFn: () => {
      if (!token || !organizationId) {
        throw new Error("Missing auth context");
      }
      return fetchOrganisationClientByIdApi(token, organizationId, clientId);
    },
    enabled: !!token && !!organizationId && !isAuthLoading,
  });

  const statusMutation = useMutation({
    mutationFn: async (input: {
      action: "activate" | "deactivate";
      reason?: string;
    }) => {
      if (!token || !organizationId) {
        throw new Error("Missing auth context");
      }
      return updateOrganisationClientStatusApi(
        token,
        organizationId,
        clientId,
        input,
      );
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({
        queryKey: ["organization", "clients"],
      });
      void queryClient.invalidateQueries({
        queryKey: ["organization", "client", organizationId, clientId],
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
    onError: (error: Error) => {
      const message = error.message || CLIENT_STATUS_UPDATE_ERROR;
      setStatusError(message);
      showErrorToast(message);
    },
  });

  const handleEdit = () => {
    router.push(`/organization/clients/${clientId}/edit`);
  };

  const handleToggleStatus = () => {
    const client = clientQuery.data;
    if (!client || !canUpdate) {
      return;
    }
    setStatusError(null);
    if (client.status === "active") {
      setDeactivateOpen(true);
      return;
    }
    setActivateOpen(true);
  };

  if (isAuthLoading || clientQuery.isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-gray-500">
        Loading client...
      </div>
    );
  }

  if (clientQuery.isError || !clientQuery.data) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-2 text-center">
        <p className="text-sm font-medium text-red-600">
          {clientQuery.error instanceof ApiClientError
            ? clientQuery.error.message
            : "Failed to load client."}
        </p>
        <button
          type="button"
          onClick={() => void clientQuery.refetch()}
          className="text-sm text-gray-600 underline"
        >
          Try again
        </button>
      </div>
    );
  }

  const client = clientQuery.data;
  const isActive = client.status === "active";
  const contracts =
    client.contractHistory?.length > 0
      ? client.contractHistory
      : (client.contracts ?? []);

  return (
    <div className="min-h-screen bg-[#f7f7f7]">
      {/* =====================================================
                Main Content
            ====================================================== */}

      <main className="px-6 py-3">
        {/* =================================================
                    Header
                ================================================== */}

        <div className="mb-3 flex items-center justify-between">
          <h1 className="text-[15px] font-semibold text-gray-900">
            {client.clientName}
          </h1>

          {canUpdate ? (
            <div className="flex items-center gap-2">
              {isActive ? (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleEdit}
                >
                  Edit
                </Button>
              ) : null}

              <Button type="button" onClick={handleToggleStatus}>
                {isActive ? "Deactivate" : "Activate"}
              </Button>
            </div>
          ) : null}
        </div>

        {/* =================================================
                    Client Summary
                ================================================== */}

        <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                Address
              </p>

              <p className="mt-1 text-xs font-semibold text-gray-900">
                {client.address || "—"}
              </p>
            </div>

            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                Total Contracts
              </p>

              <p className="mt-1 text-xs font-semibold text-gray-900">
                {client.contractCount}
              </p>
            </div>
          </div>
        </div>

        {/* =================================================
                    Points of Contact
                ================================================== */}

        <section className="mt-1">
          <h2 className="text-[13px] font-semibold text-gray-900">
            Points of contact
          </h2>

          <div className="mt-3 overflow-hidden rounded-lg border border-gray-200 bg-white">
            <div className="grid grid-cols-[1.1fr_0.8fr_1.7fr_100px] border-b border-gray-100 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
              <span>Name</span>
              <span>Contact number</span>
              <span>Email</span>
              <span />
            </div>

            {client.pointsOfContact.length > 0 ? (
              client.pointsOfContact.map((contact) => (
                <div
                  key={contact.id}
                  className="grid grid-cols-[1.1fr_0.8fr_1.7fr_100px] items-center px-4 py-3 text-xs"
                >
                  <div className="font-semibold text-gray-900">
                    {contact.name}
                  </div>

                  <div className="text-gray-600">
                    {formatPhoneDisplay(contact.contactNumber)}
                  </div>

                  <div className="text-gray-600">{contact.email}</div>

                  <div className="flex justify-end">
                    {contact.isPrimary && (
                      <span className="rounded-full bg-green-100 px-2.5 py-1 text-[10px] font-semibold text-green-700">
                        Primary
                      </span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="px-4 py-5 text-xs text-gray-500">
                No contacts available.
              </div>
            )}
          </div>
        </section>

        {/* =================================================
                    Contract History (deferred — empty until fleet link)
                ================================================== */}

        <section className="mt-2">
          <h2 className="text-[13px] font-semibold text-gray-900">
            Contract history
          </h2>

          {contracts.length === 0 ? (
            <div className="mt-3 flex min-h-[100px] flex-col items-center justify-center rounded-lg border border-gray-200 bg-white">
              <Truck className="mb-2 h-7 w-7 text-gray-400" />

              <p className="text-xs font-semibold text-gray-900">
                No contracts yet for this client
              </p>

              <p className="mt-1 text-[10px] text-gray-500">
                Selectable from New Lease Contract (Flow 01) whenever one
                starts.
              </p>
            </div>
          ) : (
            <div className="mt-3 overflow-hidden rounded-lg border border-gray-200 bg-white">
              <div className="grid grid-cols-5 border-b border-gray-100 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                <span>Contract</span>
                <span>Start date</span>
                <span>Asset classes</span>
                <span>Status</span>
                <span />
              </div>

              {contracts.map((contract) => (
                <div
                  key={contract.id}
                  className="grid grid-cols-5 items-center px-4 py-3 text-xs"
                >
                  <span className="font-semibold text-gray-900">
                    {contract.id}
                  </span>

                  <span className="text-gray-600">{contract.startDate}</span>

                  <span className="text-gray-600">
                    {contract.assetClasses || "—"}
                  </span>

                  <span>
                    <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-medium text-[#FE5720]">
                      {formatContractStatusLabel(contract.status)}
                    </span>
                  </span>

                  <span className="text-right">
                    <Link
                      href={`/fleet-leasing/lease-contracts`}
                      className="text-[#FE5720] hover:underline"
                    >
                      View
                    </Link>
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      <ConfirmDialog
        open={activateOpen}
        title="Activate client?"
        message={`${client.clientName} will be marked active and available for new lease contracts.`}
        confirmLabel="Activate"
        isConfirmPending={statusMutation.isPending}
        onClose={() => {
          if (!statusMutation.isPending) {
            setActivateOpen(false);
            setStatusError(null);
          }
        }}
        onConfirm={() => {
          void statusMutation.mutateAsync({ action: "activate" });
        }}
      />

      <ReasonRequiredDialog
        open={deactivateOpen}
        title="Deactivate client?"
        description={
          <>
            <span className="font-medium text-gray-900">
              {client.clientName}
            </span>{" "}
            will no longer be available for new lease contracts. Provide a
            reason — it is recorded in the audit log.
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
          void statusMutation.mutateAsync({
            action: "deactivate",
            reason,
          });
        }}
      />
    </div>
  );
}
