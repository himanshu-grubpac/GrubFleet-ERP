import { SetMetadata } from '@nestjs/common';

export const REQUIRE_ORGANIZATION_CONTEXT_KEY = 'require_organization_context';

/**
 * Requires a valid organization context via `X-Organization-Id` header or
 * `organizationId` query parameter, validated against the caller's memberships
 * (system-scoped roles bypass membership check).
 */
export const RequireOrganizationContext = () =>
  SetMetadata(REQUIRE_ORGANIZATION_CONTEXT_KEY, true);
