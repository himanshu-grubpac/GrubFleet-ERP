/**
 * Mirrors backend `organization-domain-event.types.ts`.
 *
 * Live FE invalidation (see event-invalidation-registry.ts):
 * - asset_register.assignment.changed
 * - fleet_leasing.contract.pool.changed
 * - asset_register.vehicle.pool.changed
 *
 * Registry-only (no invalidation yet): organisation.*, finance.*, inventory.*
 */
export const OrganizationDomainEventType = {
  ASSET_REGISTER_ASSIGNMENT_CHANGED: "asset_register.assignment.changed",
  FLEET_LEASING_CONTRACT_POOL_CHANGED: "fleet_leasing.contract.pool.changed",
  ASSET_REGISTER_VEHICLE_POOL_CHANGED: "asset_register.vehicle.pool.changed",
} as const;

export type OrganizationDomainEventTypeValue =
  (typeof OrganizationDomainEventType)[keyof typeof OrganizationDomainEventType];

export type OrganizationDomainEventPayload = {
  type: OrganizationDomainEventTypeValue | string;
  organizationId: string;
  resource: string;
  ids: Record<string, string | string[] | undefined>;
  revision: number;
};

export type OrganizationDomainEventPing = { ping: true };

export function isOrganizationDomainEventPing(
  data: unknown,
): data is OrganizationDomainEventPing {
  return (
    typeof data === "object" &&
    data !== null &&
    "ping" in data &&
    (data as OrganizationDomainEventPing).ping === true
  );
}

export function isOrganizationDomainEventPayload(
  data: unknown,
): data is OrganizationDomainEventPayload {
  if (typeof data !== "object" || data === null) {
    return false;
  }
  const row = data as OrganizationDomainEventPayload;
  return (
    typeof row.type === "string" &&
    typeof row.organizationId === "string" &&
    typeof row.resource === "string" &&
    typeof row.revision === "number"
  );
}
