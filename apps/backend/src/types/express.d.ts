import 'express-serve-static-core';

import type { AuthenticatedUser } from '../modules/auth/types/authenticated-user.type';

declare module 'express-serve-static-core' {
  interface Request {
    correlationId?: string;
    user?: AuthenticatedUser;
    /** Resolved org context after PermissionsGuard (header or query). */
    organizationId?: string;
  }
}
