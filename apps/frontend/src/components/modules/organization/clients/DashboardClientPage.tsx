"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Mail, Smartphone } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import Button from "@/components/ui/GrubpacButton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ReasonRequiredDialog } from "@/components/ui/reason-required-dialog";
import ContactCopyIcon from "@/components/ui/ContactCopyIcon";
import { useAuth } from "@/providers/auth-provider";
import { useDashboardListSearch } from "@/lib/hooks/use-dashboard-list-search";
import {
  fetchOrganisationClientsApi,
  organisationClientsQueryKey,
  updateOrganisationClientStatusApi,
  type OrganisationClientListItem,
} from "@/lib/api/organisation/clients";
import { dashboardListQueryOptions } from "@/lib/query/dashboard-list-query-options";
import { ApiClientError } from "@/lib/api/client";
import {
  CLIENT_STATUS_UPDATE_ERROR,
  showClientActivatedToast,
  showClientDeactivatedToast,
  showErrorToast,
} from "@/lib/toast/show-toast";
import { formatPhoneDisplay } from "@/lib/format/phone-format";
import DashboardTablePagination from "@/components/dashboard/DashboardTablePagination";
import { DASHBOARD_DEFAULT_PAGE_SIZE } from "@/components/dashboard/dashboard-pagination";

import DashboardFilters from "@/components/dashboard/DashboardFilters";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import DashboardTable from "@/components/dashboard/DashboardTable";
import DashboardViewCopyRowActions from "@/components/dashboard/DashboardViewCopyRowActions";
import DashboardEmptyState from "@/components/dashboard/DashboardEmptyState";

type ClientListRow = OrganisationClientListItem;

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

  const { searchInput, setSearchInput, debouncedSearch } =
    useDashboardListSearch();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");

  const [deactivateTarget, setDeactivateTarget] =
    useState<ClientListRow | null>(null);
  const [activateTarget, setActivateTarget] = useState<ClientListRow | null>(
    null,
  );
  const [statusError, setStatusError] = useState<string | null>(null);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter]);

  const clientsQuery = useQuery({
    queryKey: [
      ...organisationClientsQueryKey(organizationId ?? ""),
      debouncedSearch,
      statusFilter,
      page,
    ],
    queryFn: () => {
      if (!token || !organizationId) {
        throw new Error("Missing auth context");
      }
      return fetchOrganisationClientsApi(token, {
        organizationId,
        page,
        pageSize: DASHBOARD_DEFAULT_PAGE_SIZE,
        search: debouncedSearch.trim() || undefined,
        status:
          statusFilter === "active" || statusFilter === "inactive"
            ? statusFilter
            : undefined,
      });
    },
    enabled: !!token && !!organizationId && !isAuthLoading,
    ...dashboardListQueryOptions,
  });

  const clients = clientsQuery.data?.items ?? [];
  const totalClients = clientsQuery.data?.total ?? 0;

  const statusMutation = useMutation({
    mutationFn: async (input: {
      client: ClientListRow;
      action: "activate" | "deactivate";
      reason?: string;
    }) => {
      if (!token || !organizationId) {
        throw new Error("Organization context is required.");
      }
      return updateOrganisationClientStatusApi(
        token,
        organizationId,
        input.client.id,
        {
          action: input.action,
          reason: input.reason,
        },
      );
    },
    onSuccess: (data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: organisationClientsQueryKey(organizationId ?? ""),
      });
      setDeactivateTarget(null);
      setActivateTarget(null);
      setStatusError(null);
      if (variables.action === "activate") {
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

  const handleAddClient = () => {
    if (!canCreate) return;
    router.push("/organization/clients/create");
  };

  const handleEdit = (client: ClientListRow) => {
    router.push(`/organization/clients/${client.id}/edit`);
  };

  const handleClearFilters = () => {
    setSearchInput("");
    setStatusFilter("");
  };

  const listHasFilters =
    debouncedSearch.trim().length > 0 || statusFilter !== "";

  const isInitialLoading =
    isAuthLoading || (clientsQuery.isLoading && !clientsQuery.data);

  const clientColumns = useMemo(
    () => [
      {
        key: "clientName",
        label: "CLIENT",
        render: (client: ClientListRow) => (
          <span className="font-medium text-gray-900">{client.clientName}</span>
        ),
      },
      {
        key: "primaryPoc",
        label: "PRIMARY POC",
        render: (client: ClientListRow) => (
          <span className="text-sm text-gray-700">{client.primaryPoc}</span>
        ),
      },
      {
        key: "email",
        label: "EMAIL",
        render: (client: ClientListRow) => (
          <ContactCopyIcon value={client.email} label="email" icon={Mail} />
        ),
      },
      {
        key: "phone",
        label: "MOBILE",
        render: (client: ClientListRow) => (
          <ContactCopyIcon
            value={formatPhoneDisplay(client.phone)}
            label="mobile number"
            icon={Smartphone}
            copyKind="phone"
          />
        ),
      },
      {
        key: "contracts",
        label: "CONTRACTS",
        render: (client: ClientListRow) => (
          <span className="text-sm text-gray-700">{client.contracts}</span>
        ),
      },
      {
        key: "status",
        label: "STATUS",
        render: (client: ClientListRow) => (
          <span
            className={[
              "inline-flex rounded-full px-2.5 py-1 text-xs font-medium",
              client.status === "active"
                ? "bg-green-50 text-green-700"
                : "bg-gray-100 text-gray-500",
            ].join(" ")}
          >
            {client.status === "active" ? "Active" : "Inactive"}
          </span>
        ),
      },
    ],
    [],
  );

  const addClientAction = canCreate ? (
    <Button type="button" onClick={handleAddClient}>
      + Add Client
    </Button>
  ) : undefined;

  return (
    <>
      <DashboardLayout
        title="Clients"
        description="Client register — companies, primary points of contact, contact details, and active contracts."
        tabs={[
          {
            label: "Clients",
            href: "/organization/clients",
          },
        ]}
        activeTab="/organization/clients"
        action={addClientAction}
      >
        <DashboardFilters
          searchValue={searchInput}
          searchPlaceholder="Search by client or point of contact name"
          onSearchChange={setSearchInput}
          selectFilters={[
            {
              key: "status",
              label: "All statuses",
              options: [
                { label: "Active", value: "active" },
                { label: "Inactive", value: "inactive" },
              ],
            },
          ]}
          filterValues={{ status: statusFilter }}
          onFilterChange={(key, value) => {
            if (key === "status") {
              setStatusFilter(value);
            }
          }}
          onClear={handleClearFilters}
        />

        {isInitialLoading ? (
          <div
            className="min-h-[240px] animate-pulse rounded-lg bg-gray-100"
            aria-busy="true"
          />
        ) : clientsQuery.isError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {clientsQuery.error instanceof Error
              ? clientsQuery.error.message
              : "Failed to load clients."}
            <button
              type="button"
              onClick={() => clientsQuery.refetch()}
              className="ml-3 font-medium underline"
            >
              Retry
            </button>
          </div>
        ) : totalClients === 0 && !listHasFilters ? (
          <DashboardEmptyState
            icon={
              <Building2 className="h-7 w-7" strokeWidth={1.4} />
            }
            title="No clients added yet"
            description="Add your first client to this organisation."
            buttonLabel="Add Client"
            onButtonClick={handleAddClient}
          />
        ) : clients.length === 0 ? (
          <div className="flex min-h-[180px] flex-col items-center justify-center rounded-lg border border-gray-200 bg-white text-center">
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
              className="mt-3 text-xs font-medium text-[#FE5720] hover:underline"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <>
          <DashboardTable
            columns={clientColumns}
            data={clients}
            getRowKey={(client) => client.id}
            renderActions={(client) => {
              const isActive = client.status === "active";

              return (
                <DashboardViewCopyRowActions
                  viewHref={`/organization/clients/${client.id}`}
                  viewAriaLabel="View client"
                  copyText={`${client.clientName}\t${client.primaryPoc}\t${client.email}\t${formatPhoneDisplay(client.phone)}`}
                  copyAriaLabel="Copy client row details"
                  onEdit={
                    canUpdate && isActive
                      ? () => handleEdit(client)
                      : undefined
                  }
                  menuAriaLabel="Client actions"
                  status={client.status}
                  onActivate={
                    canUpdate && !isActive
                      ? () => {
                          setStatusError(null);
                          setActivateTarget(client);
                        }
                      : undefined
                  }
                  onDeactivate={
                    canUpdate && isActive
                      ? () => {
                          setStatusError(null);
                          setDeactivateTarget(client);
                        }
                      : undefined
                  }
                />
              );
            }}
          />
          <DashboardTablePagination
            page={page}
            pageSize={DASHBOARD_DEFAULT_PAGE_SIZE}
            total={totalClients}
            onPageChange={setPage}
          />
          </>
        )}
      </DashboardLayout>

      <ConfirmDialog
        open={!!activateTarget}
        title="Activate client?"
        message={
          activateTarget
            ? `${activateTarget.clientName} will be marked active in the client register.`
            : ""
        }
        confirmLabel="Activate"
        isConfirmPending={statusMutation.isPending}
        onClose={() => {
          if (!statusMutation.isPending) {
            setActivateTarget(null);
            setStatusError(null);
          }
        }}
        onConfirm={async () => {
          if (!activateTarget) return;
          await statusMutation.mutateAsync({
            client: activateTarget,
            action: "activate",
          });
        }}
      />

      <ReasonRequiredDialog
        open={!!deactivateTarget}
        title="Deactivate client?"
        description={
          deactivateTarget ? (
            <>
              <span className="font-medium text-gray-900">
                {deactivateTarget.clientName}
              </span>{" "}
              will be marked inactive. Provide a reason for the audit log.
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
    </>
  );
}
