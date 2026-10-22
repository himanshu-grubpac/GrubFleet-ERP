import type { QueryClient } from "@tanstack/react-query";

import { invalidateAssetAssignmentCaches } from "@/lib/query/invalidate-asset-assignment-caches";
import { invalidateLeaseContractCaches } from "@/lib/query/invalidate-lease-contract-caches";
import {
  OrganizationDomainEventType,
  type OrganizationDomainEventPayload,
} from "./organization-domain-event-types";

type InvalidationHandler = (
  queryClient: QueryClient,
  event: OrganizationDomainEventPayload,
) => Promise<void>;

function leaseContractIdFromEvent(
  event: OrganizationDomainEventPayload,
): string | undefined {
  const raw = event.ids.leaseContractId;
  return typeof raw === "string" ? raw : undefined;
}

/**
 * Maps org domain event types to TanStack Query invalidations.
 * Extend here when Organisation / Finance / Inventory subscribe to realtime.
 */
const LIVE_INVALIDATION_BY_TYPE: Partial<
  Record<string, InvalidationHandler>
> = {
  [OrganizationDomainEventType.ASSET_REGISTER_ASSIGNMENT_CHANGED]: async (
    queryClient,
    event,
  ) => {
    await invalidateAssetAssignmentCaches(
      queryClient,
      event.organizationId,
      leaseContractIdFromEvent(event),
    );
  },
  [OrganizationDomainEventType.FLEET_LEASING_CONTRACT_POOL_CHANGED]: async (
    queryClient,
    event,
  ) => {
    await invalidateLeaseContractCaches(
      queryClient,
      event.organizationId,
      leaseContractIdFromEvent(event),
    );
  },
  [OrganizationDomainEventType.ASSET_REGISTER_VEHICLE_POOL_CHANGED]: async (
    queryClient,
    event,
  ) => {
    await invalidateAssetAssignmentCaches(queryClient, event.organizationId);
  },
};

export async function invalidateQueriesForOrganizationDomainEvent(
  queryClient: QueryClient,
  event: OrganizationDomainEventPayload,
): Promise<void> {
  const handler = LIVE_INVALIDATION_BY_TYPE[event.type];
  if (!handler) {
    return;
  }
  await handler(queryClient, event);
}
