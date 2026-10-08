"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2 } from "lucide-react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import Button from "@/components/ui/GrubpacButton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ReasonRequiredDialog } from "@/components/ui/reason-required-dialog";
import { useAuth } from "@/providers/auth-provider";
import { dashboardListQueryOptions } from "@/lib/query/dashboard-list-query-options";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import {
  CLIENT_STATUS_UPDATE_ERROR,
  showClientActivatedToast,
  showClientDeactivatedToast,
  showErrorToast,
} from "@/lib/toast/show-toast";
import {
  fetchOrganisationClientsApi,
  updateOrganisationClientStatusApi,
  type OrganisationClientListItem,
} from "@/lib/api/organisation/clients";

import DashboardLayout from "@/components/dashboard/DashboardLayout";
import DashboardTable from "@/components/dashboard/DashboardTable";
import DashboardTableActions from "@/components/dashboard/DashboardTableActions";
import {
  organisationClientDetailHref,
  organisationClientEditHref,
} from "@/lib/navigation/organisation-static-routes";
import DashboardEmptyState from "@/components/dashboard/DashboardEmptyState";
import DashboardContact from "@/components/dashboard/DashboardContact";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type Client = OrganisationClientListItem;

const CLIENTS_PAGE_SIZE = 10;

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export default function ClientDashboardPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const {
    token,
    organizationId,
    isLoading: isAuthLoading,
    permissions,
  } = useAuth();

  const canCreate =
    permissions.has("organisation.create") ||
    permissions.has("organisation.manage");

  const canUpdate =
    permissions.has("organisation.update") ||
    permissions.has("organisation.manage");

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [page, setPage] = useState(1);

  const [deactivateTarget, setDeactivateTarget] = useState<Client | null>(
    null,
  );
  const [activateTarget, setActivateTarget] = useState<Client | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const clientsQuery = useQuery({
    queryKey: [
      "organization",
      "clients",
      organizationId,
      debouncedSearch,
      page,
    ],
    queryFn: () => {
      if (!token || !organizationId) {
        throw new Error("Missing auth context");
      }
      return fetchOrganisationClientsApi(token, {
        organizationId,
        page,
        pageSize: CLIENTS_PAGE_SIZE,
        search: debouncedSearch.trim() || undefined,
      });
    },
    enabled: !!token && !!organizationId && !isAuthLoading,
    ...dashboardListQueryOptions,
  });

  const clients = clientsQuery.data?.items ?? [];
  const clientsTotal = clientsQuery.data?.total ?? 0;
  const totalPages = Math.max(
    1,
    Math.ceil(clientsTotal / CLIENTS_PAGE_SIZE),
  );

  const isInitialLoading =
    isAuthLoading || (clientsQuery.isLoading && !clientsQuery.data);

  const statusMutation = useMutation({
    mutationFn: async (input: {
      client: Client;
      action: "activate" | "deactivate";
      reason?: string;
    }) => {
      if (!token || !organizationId) {
        throw new Error("Missing auth context");
      }
      return updateOrganisationClientStatusApi(
        token,
        organizationId,
        input.client.id,
        { action: input.action, reason: input.reason },
      );
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ["organization", "clients"],
      });
      setDeactivateTarget(null);
      setActivateTarget(null);
      setStatusError(null);
      if (variables.action === "activate") {
        showClientActivatedToast(variables.client.clientName);
      } else {
        showClientDeactivatedToast(variables.client.clientName);
      }
    },
    onError: (error: Error) => {
      const message = error.message || CLIENT_STATUS_UPDATE_ERROR;
      setStatusError(message);
      showErrorToast(message);
    },
  });

  const handleAddClient = () => {
    if (!canCreate) return;
    router.push("/organization/clients/create");
  };

  const addClientAction = canCreate ? (
    <Button type="button" onClick={handleAddClient}>
      + Add Client
    </Button>
  ) : undefined;

  const handleEdit = (client: Client) => {
    router.push(organisationClientEditHref(client.id));
  };

  const handleClearFilters = () => {
    setSearch("");
  };

  const handleActivate = (client: Client) => {
    setStatusError(null);
    setActivateTarget(client);
  };

  const handleDeactivate = (client: Client) => {
    setStatusError(null);
    setDeactivateTarget(client);
  };

  const clientColumns = [
    {
      key: "clientName",
      label: "COMPANY",
      render: (client: Client) => (
        <span className="font-medium uppercase text-gray-900">
          {client.clientName}
        </span>
      ),
    },

    {
      key: "primaryPoc",
      label: "PRIMARY POC",
      render: (client: Client) => (
        <span className="text-sm text-gray-700">{client.primaryPoc}</span>
      ),
    },

    {
      key: "contact",
      label: "CONTACT",
      render: (client: Client) => (
        <DashboardContact phone={client.phone} email={client.email} />
      ),
    },

    {
      key: "contracts",
      label: "CONTRACTS",
      render: (client: Client) => (
        <span className="text-sm text-gray-700">{client.contracts}</span>
      ),
    },
  ];

  if (isInitialLoading) {
    return (
      <DashboardLayout
        title="Clients"
        description="Client register — companies, primary points of contact, contact details, and active contracts."
        tabs={[
          {
            label: "Clients",
            href: "/customer",
          },
        ]}
        activeTab="/customer"
        action={addClientAction}
      >
        <div className="flex min-h-[180px] items-center justify-center rounded-lg border border-gray-200 bg-white">
          <p className="text-sm text-gray-500">Loading clients...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (clientsQuery.isError) {
    return (
      <DashboardLayout
        title="Clients"
        description="Client register — companies, primary points of contact, contact details, and active contracts."
        tabs={[
          {
            label: "Clients",
            href: "/customer",
          },
        ]}
        activeTab="/customer"
        action={addClientAction}
      >
        <div className="flex min-h-[180px] flex-col items-center justify-center rounded-lg border border-red-100 bg-white">
          <p className="text-sm font-medium text-red-600">
            Failed to load clients.
          </p>
          <button
            type="button"
            onClick={() => void clientsQuery.refetch()}
            className="mt-2 text-sm text-gray-600 underline"
          >
            Try again
          </button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Clients"
      description="Client register — companies, primary points of contact, contact details, and active contracts."
      tabs={[
        {
          label: "Clients",
          href: "/customer",
        },
      ]}
      activeTab="/customer"
      action={addClientAction}
      pagination={
        clientsTotal > CLIENTS_PAGE_SIZE
          ? {
              currentPage: page,
              totalPages,
              totalItems: clientsTotal,
              pageSize: CLIENTS_PAGE_SIZE,
              onPageChange: setPage,
            }
          : undefined
      }
    >
      {/* ---------------------------------------------------------------- */}
      {/* Client Filters                                                   */}
      {/* ---------------------------------------------------------------- */}

      <div className="mb-4 flex items-center gap-3">
        {/* Search */}
        <div className="min-w-0 flex-1">
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by company or point of contact name"
            className="
                            h-9
                            w-full
                            rounded-md
                            border
                            border-gray-200
                            bg-white
                            px-3
                            text-sm
                            text-gray-900
                            outline-none
                            placeholder:text-gray-400
                            focus:border-gray-300
                            focus:ring-1
                            focus:ring-gray-200
                        "
          />
        </div>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* Empty State                                                      */}
      {/* ---------------------------------------------------------------- */}

      {clientsTotal === 0 ? (
        <DashboardEmptyState
          icon={<Building2 className="h-7 w-7" strokeWidth={1.4} />}
          title="No clients added yet"
          description="Add your first client to this organisation."
          buttonLabel={canCreate ? "Add Client" : undefined}
          onButtonClick={canCreate ? handleAddClient : undefined}
        />
      ) : clients.length === 0 ? (
        <div
          className="
                        flex
                        min-h-[180px]
                        flex-col
                        items-center
                        justify-center
                        rounded-lg
                        border
                        border-gray-200
                        bg-white
                        text-center
                    "
        >
          <Building2
            className="mb-3 h-7 w-7 text-gray-400"
            strokeWidth={1.4}
          />

          <h3 className="text-sm font-semibold text-gray-900">
            No clients found
          </h3>

          <p className="mt-1 text-xs text-gray-500">
            Try changing your search or filters.
          </p>

          <button
            type="button"
            onClick={handleClearFilters}
            className="
                            mt-3
                            text-xs
                            font-medium
                            text-[#FE5720]
                            hover:underline
                        "
          >
            Clear filters
          </button>
        </div>
      ) : (
        <DashboardTable
          columns={clientColumns}
          data={clients}
          getRowKey={(client) => client.id}
          renderActions={(client) => (
            <DashboardTableActions
              status={client.status}
              locationId={client.id}
              viewHref={organisationClientDetailHref(client.id)}
              onEdit={
                canUpdate && client.status === "active"
                  ? () => handleEdit(client)
                  : undefined
              }
              onToggleStatus={
                canUpdate
                  ? () =>
                      client.status === "active"
                        ? handleDeactivate(client)
                        : handleActivate(client)
                  : undefined
              }
            />
          )}
        />
      )}

      <ConfirmDialog
        open={activateTarget !== null}
        title="Activate client?"
        message={
          activateTarget
            ? `${activateTarget.clientName} will be marked active and available for new lease contracts.`
            : "This client will be marked active."
        }
        confirmLabel="Activate"
        isConfirmPending={statusMutation.isPending}
        onClose={() => {
          if (!statusMutation.isPending) {
            setActivateTarget(null);
            setStatusError(null);
          }
        }}
        onConfirm={() => {
          if (!activateTarget) return;
          void statusMutation.mutateAsync({
            client: activateTarget,
            action: "activate",
          });
        }}
      />

      <ReasonRequiredDialog
        open={deactivateTarget !== null}
        title="Deactivate client?"
        description={
          deactivateTarget ? (
            <>
              <span className="font-medium text-gray-900">
                {deactivateTarget.clientName}
              </span>{" "}
              will no longer be available for new lease contracts. Provide a
              reason — it is recorded in the audit log.
            </>
          ) : null
        }
        reasonLabel="Reason for deactivation"
        reasonPlaceholder="Reason for deactivation"
        confirmLabel="Deactivate"
        pendingLabel="Deactivating..."
        isPending={statusMutation.isPending}
        error={statusError}
        onClose={() => {
          setDeactivateTarget(null);
          setStatusError(null);
        }}
        onConfirm={(reason) => {
          if (!deactivateTarget) return;
          void statusMutation.mutateAsync({
            client: deactivateTarget,
            action: "deactivate",
            reason,
          });
        }}
      />
    </DashboardLayout>
  );
}
