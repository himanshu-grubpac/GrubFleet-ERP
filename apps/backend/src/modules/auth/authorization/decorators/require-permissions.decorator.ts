import { SetMetadata } from '@nestjs/common';

export const REQUIRED_PERMISSIONS_KEY = 'required_permissions';

/** All listed permission keys must be present (AND semantics). */
export const RequirePermissions = (...permissionKeys: string[]) =>
  SetMetadata(REQUIRED_PERMISSIONS_KEY, permissionKeys);
