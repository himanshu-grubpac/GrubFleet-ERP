/**
 * Org-scoped domain events (no PII). SSE payload contract shared with portal clients.
 * Redis channel prefix `grubfleet:org-events:` — if Redis is unavailable, emit still updates
 * local SSE subscribers on the same node; cross-node delivery requires Redis.
 *
 * Live listeners (FE invalidate registry):
 * - asset_register.assignment.changed → asset-register + lease allocation caches
 * - fleet_leasing.contract.pool.changed → lease contracts + fleet availability batch
 * - asset_register.vehicle.pool.changed → asset-register vehicle / assignment availability
 *
 * Registry-only (reserved for future modules): organisation.*, finance.*, inventory.*
 */
export const OrganizationDomainEventType = {
  ASSET_REGISTER_ASSIGNMENT_CHANGED: 'asset_register.assignment.changed',
  FLEET_LEASING_CONTRACT_POOL_CHANGED: 'fleet_leasing.contract.pool.changed',
  ASSET_REGISTER_VEHICLE_POOL_CHANGED: 'asset_register.vehicle.pool.changed',
} as const;

export type OrganizationDomainEventTypeValue =
  (typeof OrganizationDomainEventType)[keyof typeof OrganizationDomainEventType];

export type OrganizationDomainEventIds = Record<
  string,
  string | string[] | undefined
>;

export type OrganizationDomainEventPayload = {
  type: OrganizationDomainEventTypeValue;
  organizationId: string;
  resource: string;
  ids: OrganizationDomainEventIds;
  revision: number;
};

export type EmitOrganizationDomainEventInput = Omit<
  OrganizationDomainEventPayload,
  'revision'
>;

export const ORG_DOMAIN_EVENTS_REDIS_CHANNEL_PREFIX = 'grubfleet:org-events:';

export function orgDomainEventsRedisChannel(organizationId: string): string {
  return `${ORG_DOMAIN_EVENTS_REDIS_CHANNEL_PREFIX}${organizationId}`;
}

export function orgDomainEventsRevisionKey(organizationId: string): string {
  return `grubfleet:org-event-revision:${organizationId}`;
}
