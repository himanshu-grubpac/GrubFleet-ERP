/** Cross-app DTO stubs — expand as API contracts stabilize. */
export type ApiErrorResponse = {
  message: string;
  code: string;
  statusCode: number;
  correlationId?: string;
  details?: unknown;
};

export type HealthLiveness = {
  status: string;
  service: string;
};

export type HealthReadiness = {
  status: string;
  checks: {
    database: string;
    redis: string;
    drizzle: string;
  };
};

/** Module scaffold ping — not a product API. */
export type ModuleStatus = {
  module: string;
  implemented: boolean;
  note?: string;
};

export type AuthTokenPair = {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
};

export type AuthMeUser = {
  id: string;
  email: string;
  fullName: string | null;
  isActive: boolean;
  emailVerifiedAt: string | null;
};

export type AuthMeMembership = {
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  status: 'invited' | 'active' | 'suspended';
  joinedAt: string | null;
  roles: Array<{
    id: string;
    name: string;
    scope: 'system' | 'organization';
  }>;
  permissionKeys: string[];
  /** Increments when org role permissions or assignments change (server cache invalidation). */
  permissionRevision: number;
  moduleAccess: Array<{
    moduleId: string;
    accessLevel: 'VIEW' | 'MANAGE' | 'FULL' | 'CUSTOM';
  }>;
};

export type ModuleAccessLevel = 'NONE' | 'VIEW' | 'MANAGE' | 'FULL' | 'CUSTOM';

export type ModuleAccessEntry = {
  moduleId: string;
  accessLevel: Exclude<ModuleAccessLevel, 'NONE' | 'CUSTOM'>;
};

export type AuthMeResponse = {
  user: AuthMeUser;
  memberships: AuthMeMembership[];
  permissionKeys: string[];
  moduleAccess: Array<{
    moduleId: string;
    accessLevel: 'VIEW' | 'MANAGE' | 'FULL' | 'CUSTOM';
  }>;
};

export type PaginatedResponse<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type Organization = {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type UserMember = {
  id: string;
  email: string;
  fullName: string | null;
  isActive: boolean;
  membershipStatus: 'invited' | 'active' | 'suspended';
  joinedAt: string | null;
};

export type CreateUserResponse = UserMember & {
  temporaryPassword?: string;
};

export type PermissionCatalogItem = {
  id: string;
  key: string;
  module: string;
  action: string;
  description: string | null;
};

export type Role = {
  id: string;
  organizationId: string | null;
  name: string;
  scope: 'system' | 'organization';
  description: string | null;
  isSystem: boolean;
  permissionKeys: string[];
  moduleAccess: ModuleAccessEntry[];
  createdAt: string;
  updatedAt: string;
};

export type AuditLogEntry = {
  id: string;
  organizationId: string | null;
  userId: string | null;
  action: string;
  resourceType: string | null;
  resourceId: string | null;
  status: string;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  correlationId: string | null;
  createdAt: string;
};
