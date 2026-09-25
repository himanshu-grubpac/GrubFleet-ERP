import { SetMetadata } from '@nestjs/common';

export const REQUIRED_ANY_PERMISSIONS_KEY = 'required_any_permissions';

/** Caller must hold at least one of the listed permission keys (OR semantics). */
export const RequireAnyPermissions = (...permissionKeys: string[]) =>
  SetMetadata(REQUIRED_ANY_PERMISSIONS_KEY, permissionKeys);
