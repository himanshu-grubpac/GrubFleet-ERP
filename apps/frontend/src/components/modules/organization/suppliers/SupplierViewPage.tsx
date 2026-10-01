"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import Button from "@/components/ui/GrubpacButton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ReasonRequiredDialog } from "@/components/ui/reason-required-dialog";
import { DashboardSubpageHeader } from "@/components/dashboard/DashboardSubpageHeader";
import { useAuth } from "@/providers/auth-provider";
import {
  fetchOrganisationSupplierByIdApi,
  updateOrganisationSupplierStatusApi,
  type OrganisationSupplierTypeKey,
} from "@/lib/api/organisation/suppliers";
import { ApiClientError } from "@/lib/api/client";
import { formatStructuredAddressMultiline } from "@/lib/format/address-format";
import { formatPhoneDisplay } from "@/lib/format/phone-format";
import {
  showErrorToast,
  showSupplierActivatedToast,
  showSupplierDeactivatedToast,
  SUPPLIER_STATUS_UPDATE_ERROR,
} from "@/lib/toast/show-toast";

const LINKED_TABLE_COLUMNS: Record<
  OrganisationSupplierTypeKey,
  Array<{ key: string; label: string }>
> = {
  spare_parts: [
    { key: "part", label: "PART" },
    { key: "category", label: "CATEGORY" },
    { key: "lastBatchReceived", label: "LAST BATCH RECEIVED" },
    { key: "onHandQty", label: "ON-HAND QTY" },
  ],
  driver: [
    { key: "driver", label: "DRIVER" },
    { key: "licenseNo", label: "LICENSE NO." },
    { key: "assignedVehicle", label: "ASSIGNED VEHICLE" },
    { key: "status", label: "STATUS" },
  ],
  bike: [
    { key: "vehicle", label: "VEHICLE" },
    { key: "model", label: "MODEL" },
    { key: "registration", label: "REGISTRATION" },
    { key: "status", label: "STATUS" },
  ],
  compliance: [
    { key: "renewal", label: "RENEWAL" },
    { key: "type", label: "TYPE" },
    { key: "expiry", label: "EXPIRY" },
    { key: "status", label: "STATUS" },
  ],
};

const LINKED_EMPTY_COPY: Record<OrganisationSupplierTypeKey, string> = {
  spare_parts:
    "No linked parts yet. Inventory linking will appear here when that module ships.",
  bike: "No linked vehicles yet. Asset register links will appear here when wired.",
  compliance:
    "No linked renewals yet. Compliance module links will appear here when wired.",
  driver: "No drivers linked to this staffing supplier yet.",
};

export default function SupplierViewPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const supplierId = params.id as string;

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

  const supplierQuery = useQuery({
    queryKey: ["organization", "supplier", organizationId, supplierId],
    queryFn: () => {
      if (!token || !organizationId) {
        throw new Error("Missing auth context");
      }
      return fetchOrganisationSupplierByIdApi(
        token,
        organizationId,
        supplierId,
      );
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
      return updateOrganisationSupplierStatusApi(
        token,
        organizationId,
        supplierId,
        input,
      );
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({
        queryKey: ["organization", "supplier"],
      });
      void queryClient.invalidateQueries({
        queryKey: ["organization", "suppliers"],
      });
      setDeactivateOpen(false);
      setActivateOpen(false);
      setStatusError(null);
      if (data.status === "active") {
        showSupplierActivatedToast(data.name);
      } else {
        showSupplierDeactivatedToast(data.name);
      }
    },
    onError: (error: Error) => {
      const message =
        error instanceof ApiClientError
          ? error.message || SUPPLIER_STATUS_UPDATE_ERROR
          : error.message || SUPPLIER_STATUS_UPDATE_ERROR;
      setStatusError(message);
      showErrorToast(message);
    },
  });

  const supplier = supplierQuery.data;

  if (supplierQuery.isLoading || isAuthLoading) {
    return (
      <SupplierDetailChrome>
        <main className="px-6 py-8">
          <div
            className="h-40 animate-pulse rounded-lg bg-gray-200"
            aria-busy="true"
          />
        </main>
      </SupplierDetailChrome>
    );
  }

  if (supplierQuery.isError || !supplier) {
    return (
      <SupplierDetailChrome>
        <main className="px-6 py-8">
          <p className="text-sm text-red-600" role="alert">
            {supplierQuery.error instanceof Error
              ? supplierQuery.error.message
              : "Supplier not found."}
          </p>
          <button
            type="button"
            onClick={() => supplierQuery.refetch()}
            className="mt-3 text-sm font-medium text-[#FE5720] hover:underline"
          >
            Retry
          </button>
        </main>
      </SupplierDetailChrome>
    );
  }

  const reliability = supplier.linkedSections.reliability;
  const linked = supplier.linkedSections.linked;
  const showReliability =
    reliability !== null && reliability.items.length > 0;
  const showLinkedSection = true;
  const showLinkedTable = linked.items.length > 0;
  const linkedColumns =
    LINKED_TABLE_COLUMNS[supplier.supplierType] ??
    (linked.items[0]
      ? Object.keys(linked.items[0]).map((key) => ({
          key,
          label: key.toUpperCase(),
        }))
      : []);

  return (
    <>
      <SupplierDetailChrome breadcrumbName={supplier.name}>
        <main className="px-6 py-3 pb-8">
          <div className="mb-4 flex items-start justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold text-gray-900">
                {supplier.name}
              </h1>
              {supplier.status === "active" ? (
                <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-medium text-[#FE5720]">
                  {supplier.type}
                </span>
              ) : (
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">
                  Inactive
                </span>
              )}
            </div>

            {canUpdate ? (
              <div className="flex items-center gap-2">
                {supplier.status === "active" ? (
                  <>
                    <Button
                      type="button"
                      variant="neutral"
                      onClick={() =>
                        router.push(
                          `/organization/suppliers/${supplier.id}/edit`,
                        )
                      }
                      className="h-9 border-gray-300 bg-white px-5 text-gray-700 hover:bg-gray-50"
                    >
                      Edit
                    </Button>
                    <Button
                      type="button"
                      variant="neutral"
                      onClick={() => {
                        setStatusError(null);
                        setDeactivateOpen(true);
                      }}
                      className="h-9 border-red-500 bg-white px-5 text-red-600 hover:bg-red-50"
                    >
                      Deactivate
                    </Button>
                  </>
                ) : (
                  <Button
                    type="button"
                    variant="neutral"
                    onClick={() => {
                      setStatusError(null);
                      setActivateOpen(true);
                    }}
                    className="h-9 border-[#FE5720] bg-white px-5 text-[#FE5720] hover:bg-orange-50"
                  >
                    Activate
                  </Button>
                )}
              </div>
            ) : null}
          </div>

          <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <InfoItem label="CONTACT PERSON" value={supplier.contactPerson} />
              <InfoItem
                label="PHONE"
                value={formatPhoneDisplay(supplier.phone) || supplier.phone}
              />
              <InfoItem label="EMAIL" value={supplier.email} />
              <InfoItem
                label="AGREEMENT REFERENCE"
                value={supplier.agreementReference || "—"}
              />
            </div>
            <div className="mt-3">
              <p className="text-[10px] font-medium text-gray-400">ADDRESS</p>
              <p className="mt-0.5 whitespace-pre-line text-xs text-gray-600">
                {formatStructuredAddressMultiline({
                  addressLine1: supplier.addressLine1,
                  addressLine2: supplier.addressLine2,
                  addressCity: supplier.addressCity,
                  addressState: supplier.addressState,
                  addressDistrict: supplier.addressDistrict,
                  addressPincode: supplier.addressPincode,
                  addressCountry: supplier.addressCountry,
                  address: supplier.address,
                })}
              </p>
            </div>
          </div>

          {showReliability && reliability ? (
            <section className="mt-4">
              <h2 className="mb-3 text-sm font-semibold text-gray-900">
                {reliability.title}
              </h2>
              <DataTable
                columns={[
                  { key: "incident", label: "INCIDENT" },
                  { key: "date", label: "DATE" },
                  { key: "details", label: "DETAILS" },
                ]}
                rows={reliability.items}
              />
            </section>
          ) : null}

          {showLinkedSection ? (
            <section className="mt-4">
              <h2 className="mb-3 text-sm font-semibold text-gray-900">
                {linked.title}
              </h2>
              {showLinkedTable ? (
                <DataTable
                  columns={linkedColumns}
                  rows={linked.items}
                  linkColumnKey={
                    supplier.supplierType === "driver" ? "driver" : undefined
                  }
                  getRowHref={
                    supplier.supplierType === "driver"
                      ? (row) =>
                          typeof row.id === "string"
                            ? `/organization/driver-register/${row.id}`
                            : undefined
                      : undefined
                  }
                />
              ) : (
                <p className="rounded-lg border border-gray-200 bg-white px-4 py-6 text-sm text-gray-500">
                  {LINKED_EMPTY_COPY[supplier.supplierType]}
                </p>
              )}
            </section>
          ) : null}
        </main>
      </SupplierDetailChrome>

      <ConfirmDialog
        open={activateOpen}
        title="Activate supplier?"
        message={`${supplier.name} will be marked active in the supplier register.`}
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
        title="Deactivate supplier?"
        description={
          <>
            <span className="font-medium text-gray-900">{supplier.name}</span>{" "}
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
          void statusMutation.mutateAsync({
            action: "deactivate",
            reason,
          });
        }}
      />
    </>
  );
}

function SupplierDetailChrome({
  breadcrumbName,
  children,
}: {
  breadcrumbName?: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#f7f7f7]">
      <DashboardSubpageHeader
        backHref="/organization/suppliers"
        backLabel="Back to suppliers"
        currentLabel={breadcrumbName}
      />
      {children}
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-medium text-gray-400">{label}</p>
      <p className="mt-0.5 text-xs font-medium text-gray-800">{value}</p>
    </div>
  );
}

function DataTable({
  columns,
  rows,
  linkColumnKey,
  getRowHref,
}: {
  columns: Array<{ key: string; label: string }>;
  rows: Array<Record<string, string | number>>;
  linkColumnKey?: string;
  getRowHref?: (row: Record<string, string | number>) => string | undefined;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-gray-200">
            {columns.map((column) => (
              <th
                key={column.key}
                className="px-3 py-2 text-[10px] font-medium text-gray-400"
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr
              key={`${index}-${String(row[columns[0]?.key ?? "row"])}`}
              className="border-b border-gray-100 last:border-0"
            >
              {columns.map((column) => {
                const value = row[column.key] ?? "—";
                const href =
                  linkColumnKey === column.key && getRowHref
                    ? getRowHref(row)
                    : undefined;
                return (
                  <td
                    key={column.key}
                    className="px-3 py-2.5 text-xs text-gray-700"
                  >
                    {href ? (
                      <Link
                        href={href}
                        className="font-medium text-[#FE5720] hover:underline"
                      >
                        {value}
                      </Link>
                    ) : (
                      value
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
