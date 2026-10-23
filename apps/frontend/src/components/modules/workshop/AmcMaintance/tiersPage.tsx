"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import OrganizationFormLayout from "@/components/common/OrganizationFormLayout";
import Button from "@/components/ui/GrubpacButton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ReasonRequiredDialog } from "@/components/ui/reason-required-dialog";
import { RestrictedInput } from "@/components/ui/RestrictedInput";
import { fetchAllPaginatedItems } from "@/lib/api/fetch-all-paginated";
import { fetchAllActiveAssetRegisterVehiclesApi } from "@/lib/api/asset-register/vehicles";
import { WORKSHOP_INPUT_LIMITS } from "@/lib/forms/restricted-input";
import { parseRupeeInputToMinor } from "@/lib/format/money-format";
import { ApiClientError } from "@/lib/api/client";
import {
  createWorkshopAmcSubscriberApi,
  fetchWorkshopAmcSubscribersApi,
  fetchWorkshopAmcTierApi,
  updateWorkshopAmcTierApi,
  updateWorkshopAmcTierStatusApi,
  type WorkshopAmcSubscriberListItem,
  type WorkshopAmcTierDetail,
} from "@/lib/api/workshop/amc";
import { WORKSHOP_FORM_CATALOG_PAGE_SIZE } from "@/lib/api/workshop/catalog-page-size";
import { dashboardCatalogQueryOptions } from "@/lib/query/dashboard-list-query-options";
import { useWorkshopEntityId } from "@/lib/navigation/use-workshop-entity-id";
import {
  isWorkshopStaticEditPath,
  workshopAmcMaintenanceListHref,
  workshopAmcTierDetailHref,
  workshopAmcSubscriberDetailHref,
  workshopAmcTierEditHref,
} from "@/lib/navigation/workshop-static-routes";
import {
  showErrorToast,
  showSuccessToast,
} from "@/lib/toast/show-toast";
import { useAuth } from "@/providers/auth-provider";

export default function AmcTierDetailsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const isEditRoute = isWorkshopStaticEditPath(pathname);
  const tierId = useWorkshopEntityId("tierId");
  const queryClient = useQueryClient();
  const { token, organizationId, isLoading: isAuthLoading, permissions } =
    useAuth();

  const canUpdate =
    permissions.has("workshop.update") ||
    permissions.has("workshop.manage");
  const canCreate =
    permissions.has("workshop.create") ||
    permissions.has("workshop.manage");

  const [activateOpen, setActivateOpen] = useState(false);
  const [deactivateOpen, setDeactivateOpen] = useState(false);
  const [subscribeVehicleId, setSubscribeVehicleId] = useState("");

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [tierPriceInput, setTierPriceInput] = useState("");
  const [tierPriceDirty, setTierPriceDirty] = useState(false);

  const tierQuery = useQuery({
    queryKey: ["workshop", "amc-tier", organizationId, tierId],
    queryFn: () => fetchWorkshopAmcTierApi(token!, organizationId!, tierId),
    enabled: !!token && !!organizationId && !!tierId && !isAuthLoading,
  });

  const tier = tierQuery.data;

  const subscribersQuery = useQuery({
    queryKey: ["workshop", "amc-tier-subscribers", organizationId, tierId],
    queryFn: () =>
      fetchAllPaginatedItems(
        (page, pageSize) =>
          fetchWorkshopAmcSubscribersApi(token!, {
            organizationId: organizationId!,
            amcTierId: tierId,
            page,
            pageSize,
          }),
        WORKSHOP_FORM_CATALOG_PAGE_SIZE,
      ),
    enabled:
      !!token && !!organizationId && !!tierId && !isAuthLoading && !isEditRoute,
  });

  const subscribers = subscribersQuery.data ?? [];

  const vehiclesQuery = useQuery({
    queryKey: ["workshop", "amc-subscribe-vehicles", organizationId],
    queryFn: () =>
      fetchAllActiveAssetRegisterVehiclesApi({
        token: token!,
        organizationId: organizationId!,
      }),
    enabled:
      !!token &&
      !!organizationId &&
      !isAuthLoading &&
      !isEditRoute &&
      canCreate,
    ...dashboardCatalogQueryOptions,
    placeholderData: keepPreviousData,
  });

  const vehicles = vehiclesQuery.data ?? [];
  const vehiclesCatalogLoading =
    vehiclesQuery.isLoading && vehicles.length === 0;

  useEffect(() => {
    if (isAuthLoading) return;
    if (!tierId) {
      router.replace(workshopAmcMaintenanceListHref);
    }
  }, [isAuthLoading, tierId, router]);

  useEffect(() => {
    if (!tier || !isEditRoute) return;
    if (tier.status === "inactive") {
      router.replace(workshopAmcTierDetailHref(tierId));
    }
  }, [tier, isEditRoute, tierId, router]);

  useEffect(() => {
    if (!tier || !isEditRoute) return;
    setName(tier.name);
    setDescription(tier.description ?? "");
    setTierPriceInput("");
    setTierPriceDirty(false);
  }, [tier, isEditRoute]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!token || !organizationId) {
        throw new Error("Missing auth context");
      }
      const payload: Parameters<typeof updateWorkshopAmcTierApi>[2] = {
        organizationId,
        name: name.trim(),
        description: description.trim() || null,
      };
      if (tierPriceDirty) {
        const trimmedPrice = tierPriceInput.trim();
        payload.pricePaise =
          trimmedPrice.length > 0
            ? parseRupeeInputToMinor(trimmedPrice)
            : null;
      }
      return updateWorkshopAmcTierApi(token, tierId, payload);
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({
        queryKey: ["workshop", "amc-tiers"],
      });
      showSuccessToast(`${data.name} was updated`);
      router.push(workshopAmcTierDetailHref(tierId));
    },
    onError: (error: Error) => {
      const message =
        error instanceof ApiClientError
          ? error.message
          : "Could not save tier. Try again.";
      showErrorToast(message);
    },
  });

  const statusMutation = useMutation({
    mutationFn: async (input: {
      action: "activate" | "deactivate";
      reason?: string;
    }) => {
      if (!token || !organizationId) {
        throw new Error("Missing auth context");
      }
      return updateWorkshopAmcTierStatusApi(
        token,
        tierId,
        organizationId,
        input.action,
        input.reason,
      );
    },
    onSuccess: (data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ["workshop", "amc-tiers"],
      });
      void queryClient.invalidateQueries({
        queryKey: ["workshop", "amc-tier", organizationId, tierId],
      });
      setActivateOpen(false);
      setDeactivateOpen(false);
      showSuccessToast(
        variables.action === "activate"
          ? `${data.name} was activated`
          : `${data.name} was deactivated`,
      );
    },
    onError: (error: Error) => {
      showErrorToast(
        error instanceof ApiClientError
          ? error.message
          : "Could not update tier status.",
      );
    },
  });

  type SubscribeVehicleInput = {
    organizationId: string;
    tierId: string;
    vehicleId: string;
  };

  const subscribeMutation = useMutation({
    mutationFn: (input: SubscribeVehicleInput) => {
      if (!token) {
        throw new Error("Missing auth context");
      }
      return createWorkshopAmcSubscriberApi(token, {
        organizationId: input.organizationId,
        amcTierId: input.tierId,
        vehicleId: input.vehicleId,
      });
    },
    onMutate: (input) => {
      // Clear before pending ends so canSubscribe never briefly re-enables the primary.
      setSubscribeVehicleId("");
      return { vehicleId: input.vehicleId };
    },
    onSuccess: (detail, variables) => {
      queryClient.setQueryData<WorkshopAmcTierDetail>(
        ["workshop", "amc-tier", organizationId, variables.tierId],
        (existing) =>
          existing
            ? {
                ...existing,
                subscriberCount: existing.subscriberCount + 1,
              }
            : existing,
      );
      const subscribersKey = [
        "workshop",
        "amc-tier-subscribers",
        organizationId,
        variables.tierId,
      ] as const;
      queryClient.setQueryData<WorkshopAmcSubscriberListItem[]>(
        subscribersKey,
        (existing) => {
          const list = existing ?? [];
          if (list.some((row) => row.id === detail.id)) {
            return list;
          }
          const row: WorkshopAmcSubscriberListItem = {
            id: detail.id,
            subscriberCode: detail.subscriberCode,
            amcTierId: detail.amcTierId,
            tierName: detail.tierName,
            vehicleId: detail.vehicleId,
            fleetCode: detail.fleetCode,
            registrationNumber: detail.registrationNumber,
            assetClassName: detail.assetClassName,
            startedAt: detail.startedAt,
          };
          return [...list, row];
        },
      );
      void queryClient.invalidateQueries({
        queryKey: subscribersKey,
        refetchType: "none",
      });
      void queryClient.invalidateQueries({
        queryKey: ["workshop", "amc-tiers"],
        refetchType: "none",
      });
      showSuccessToast(
        `${detail.fleetCode} was subscribed to ${tier?.name ?? "tier"}`,
      );
    },
    onError: (error: Error, _variables, context) => {
      if (context?.vehicleId) {
        setSubscribeVehicleId(context.vehicleId);
      }
      showErrorToast(
        error instanceof ApiClientError
          ? error.message
          : "Could not subscribe vehicle.",
      );
    },
  });

  const canSubscribe = useMemo(() => {
    if (!canCreate || tier?.status !== "active") return false;
    if (!subscribeVehicleId.trim() || !tierId || !organizationId || !token) {
      return false;
    }
    return true;
  }, [
    canCreate,
    tier?.status,
    subscribeVehicleId,
    tierId,
    organizationId,
    token,
  ]);

  const { mutate: subscribeMutate, isPending: isSubscribePending } =
    subscribeMutation;

  const handleSubscribe = useCallback(() => {
    const vehicleId = subscribeVehicleId.trim();
    if (
      !canSubscribe ||
      !organizationId ||
      !tierId ||
      isSubscribePending
    ) {
      return;
    }
    subscribeMutate({
      organizationId,
      tierId,
      vehicleId,
    });
  }, [
    canSubscribe,
    isSubscribePending,
    organizationId,
    subscribeMutate,
    subscribeVehicleId,
    tierId,
  ]);

  if (!tierId && !isAuthLoading) {
    return null;
  }

  if (tierQuery.isLoading || isAuthLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-gray-500">
        Loading AMC tier…
      </div>
    );
  }

  if (tierQuery.isError || !tier) {
    return (
      <div className="min-h-full bg-gray-50 px-5 py-4 text-sm text-gray-700">
        <p>Could not load this AMC tier.</p>
        <Button
          type="button"
          variant="secondary"
          className="mt-3"
          onClick={() => router.push(workshopAmcMaintenanceListHref)}
        >
          Back to AMC &amp; Maintenance
        </Button>
      </div>
    );
  }

  const editInputClass =
    "mt-1 h-9 w-full rounded-md border border-gray-200 px-3 text-sm outline-none focus:border-[#FE5720] focus:ring-1 focus:ring-[#FE5720]/20";

  if (isEditRoute) {
    const tierPriceValid =
      !tierPriceDirty ||
      !tierPriceInput.trim() ||
      parseRupeeInputToMinor(tierPriceInput) !== null;
    const canSubmitEdit =
      canUpdate &&
      !!name.trim() &&
      tierPriceValid &&
      !saveMutation.isPending;

    return (
      <OrganizationFormLayout
        title="Edit AMC tier"
        backLink={{
          label: "Back to tier",
          href: workshopAmcTierDetailHref(tierId),
        }}
        contentVariant="plain"
      >
        <div className="w-full space-y-3 rounded-lg border border-gray-200 bg-white p-4">
          <label className="block text-xs font-medium text-gray-700">
            Tier name
            <RestrictedInput
              restrictedKind="name"
              maxLength={WORKSHOP_INPUT_LIMITS.amcTierName}
              value={name}
              onChange={(value) => setName(value)}
              className={editInputClass}
            />
          </label>
          <label className="block text-xs font-medium text-gray-700">
            Price (optional — leave blank to keep current)
            <RestrictedInput
              restrictedKind="inrRupee"
              value={tierPriceInput}
              onChange={(value) => {
                setTierPriceDirty(true);
                setTierPriceInput(value);
              }}
              placeholder={
                tier?.priceDisplayLabel
                  ? `Current: ${tier.priceDisplayLabel}`
                  : "e.g. 12,000"
              }
              className={editInputClass}
            />
          </label>
          <label className="block text-xs font-medium text-gray-700">
            Description
            <RestrictedInput
              restrictedKind="text"
              maxLength={WORKSHOP_INPUT_LIMITS.amcTierDescription}
              value={description}
              onChange={(value) => setDescription(value)}
              className={editInputClass}
            />
          </label>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.push(workshopAmcTierDetailHref(tierId))}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!canSubmitEdit}
            onClick={() => saveMutation.mutate()}
          >
            {saveMutation.isPending ? "Saving…" : "Save"}
          </Button>
        </div>
      </OrganizationFormLayout>
    );
  }

  return (
    <div className="min-h-full bg-gray-50 px-5 py-4 text-[14px] text-gray-800">
      <nav className="mb-5 flex flex-wrap items-center gap-2 text-xs text-gray-500">
        <button
          type="button"
          onClick={() => router.push(workshopAmcMaintenanceListHref)}
          className="hover:text-[#FE5720]"
        >
          AMC &amp; Maintenance
        </button>
        <span>/</span>
        <span className="text-gray-800">{tier.name}</span>
      </nav>

      <header className="mb-5 flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-[14px] font-semibold text-gray-900">
              {tier.name}
            </h1>
            <span
              className={
                tier.status === "active"
                  ? "rounded-full bg-green-50 px-2 py-1 text-[14px] font-medium text-green-700"
                  : "rounded-full bg-gray-100 px-2 py-1 text-[14px] font-medium text-gray-600"
              }
            >
              {tier.status === "active" ? "Active" : "Inactive"}
            </span>
          </div>
          {tier.priceDisplayLabel ? (
            <p className="mt-1 text-xs text-gray-500">{tier.priceDisplayLabel}</p>
          ) : null}
          {tier.description ? (
            <p className="mt-1 text-xs text-gray-600">{tier.description}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {canUpdate && tier.status === "active" ? (
            <Button
              type="button"
              variant="outline"
              className="h-8 text-xs"
              onClick={() => router.push(workshopAmcTierEditHref(tierId))}
            >
              Edit tier
            </Button>
          ) : null}
          {canUpdate && tier.status === "active" ? (
            <Button
              type="button"
              variant="secondary"
              className="h-8 text-xs"
              onClick={() => setDeactivateOpen(true)}
            >
              Deactivate
            </Button>
          ) : null}
          {canUpdate && tier.status === "inactive" ? (
            <Button
              type="button"
              className="h-8 text-xs"
              onClick={() => setActivateOpen(true)}
            >
              Activate
            </Button>
          ) : null}
        </div>
      </header>

      {canCreate && tier.status === "active" ? (
        <section className="mb-5 w-full rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-gray-900">
            Subscribe vehicle
          </h2>
          <p className="mt-1 text-xs text-gray-500">
            Link an active fleet vehicle to this AMC tier.
          </p>
          <div className="mt-3 flex flex-wrap items-end gap-2">
            <label className="min-w-[220px] flex-1 text-xs font-medium text-gray-700">
              Vehicle
              <select
                value={subscribeVehicleId}
                onChange={(event) => setSubscribeVehicleId(event.target.value)}
                className="mt-1 h-9 w-full rounded-md border border-gray-200 px-2 text-sm"
                disabled={vehiclesCatalogLoading}
              >
                <option value="">Select vehicle…</option>
                {vehicles.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.fleetCode} — {vehicle.registrationNumber}
                  </option>
                ))}
              </select>
            </label>
            <Button
              type="button"
              className="min-w-[7.75rem] shrink-0"
              disabled={!canSubscribe || isSubscribePending}
              onClick={handleSubscribe}
            >
              {isSubscribePending ? "Subscribing…" : "Subscribe"}
            </Button>
          </div>
          {vehiclesQuery.isError ? (
            <p className="mt-2 text-xs text-red-600" role="alert">
              Could not load fleet vehicles. Refresh the page and try again.
            </p>
          ) : null}
        </section>
      ) : null}

      <section className="w-full overflow-hidden rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-900">Subscribers</h2>
          <p className="mt-1 text-xs text-gray-500">
            {tier.subscriberCount} vehicle
            {tier.subscriberCount === 1 ? "" : "s"} on this tier
          </p>
        </div>
        {subscribersQuery.isLoading ? (
          <p className="px-4 py-6 text-xs text-gray-500">Loading subscribers…</p>
        ) : subscribers.length === 0 ? (
          <p className="px-4 py-6 text-xs text-gray-500">
            No vehicles subscribed to this tier yet.
          </p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {subscribers.map((row) => (
              <li key={row.id} className="flex items-center justify-between px-4 py-3">
                <div className="text-xs">
                  <p className="font-medium text-gray-900">{row.fleetCode}</p>
                  <p className="text-gray-500">
                    {row.registrationNumber} · {row.assetClassName}
                  </p>
                </div>
                <button
                  type="button"
                  className="text-xs font-medium text-[#FE5720] hover:underline"
                  onClick={() =>
                    router.push(workshopAmcSubscriberDetailHref(row.subscriberCode))
                  }
                >
                  View
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ConfirmDialog
        open={activateOpen}
        title="Activate AMC tier?"
        message={`${tier.name} will be available for new subscriptions.`}
        confirmLabel="Activate"
        isConfirmPending={statusMutation.isPending}
        onConfirm={() => statusMutation.mutate({ action: "activate" })}
        onClose={() => setActivateOpen(false)}
      />
      <ReasonRequiredDialog
        open={deactivateOpen}
        title="Deactivate AMC tier?"
        description={`${tier.name} will no longer accept new subscriptions.`}
        confirmLabel="Deactivate"
        isPending={statusMutation.isPending}
        onConfirm={(reason) =>
          statusMutation.mutate({ action: "deactivate", reason })
        }
        onClose={() => setDeactivateOpen(false)}
      />
    </div>
  );
}
