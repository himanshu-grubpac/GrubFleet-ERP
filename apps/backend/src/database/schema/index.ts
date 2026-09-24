import { relations } from 'drizzle-orm';
import {
  boolean,
  index,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

export const membershipStatusEnum = pgEnum('membership_status', [
  'invited',
  'active',
  'suspended',
]);

export const roleScopeEnum = pgEnum('role_scope', ['system', 'organization']);

export const organizations = pgTable(
  'organizations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 100 }).notNull(),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex('organizations_slug_uidx').on(t.slug)],
);

/** Legal entity under an organization (provisional — see REQUIREMENTS_GAPS). */
export const companies = pgTable(
  'companies',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    legalName: varchar('legal_name', { length: 255 }).notNull(),
    registrationNumber: varchar('registration_number', { length: 100 }),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index('companies_organization_id_idx').on(t.organizationId)],
);

export const users = pgTable(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    email: varchar('email', { length: 320 }).notNull(),
    passwordHash: text('password_hash'),
    fullName: varchar('full_name', { length: 255 }),
    isActive: boolean('is_active').notNull().default(true),
    emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex('users_email_uidx').on(t.email)],
);

export const memberships = pgTable(
  'memberships',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    status: membershipStatusEnum('status').notNull().default('invited'),
    joinedAt: timestamp('joined_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex('memberships_user_org_uidx').on(t.userId, t.organizationId),
    index('memberships_organization_id_idx').on(t.organizationId),
  ],
);

export const permissions = pgTable(
  'permissions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    /** Provisional catalog key, e.g. fleet:VIEW */
    key: varchar('key', { length: 120 }).notNull(),
    module: varchar('module', { length: 64 }).notNull(),
    action: varchar('action', { length: 32 }).notNull(),
    description: text('description'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex('permissions_key_uidx').on(t.key)],
);

export const roles = pgTable(
  'roles',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id').references(() => organizations.id, {
      onDelete: 'cascade',
    }),
    name: varchar('name', { length: 120 }).notNull(),
    scope: roleScopeEnum('scope').notNull().default('organization'),
    description: text('description'),
    isSystem: boolean('is_system').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('roles_organization_id_idx').on(t.organizationId),
    uniqueIndex('roles_org_name_uidx').on(t.organizationId, t.name),
  ],
);

export const rolePermissions = pgTable(
  'role_permissions',
  {
    roleId: uuid('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'cascade' }),
    permissionId: uuid('permission_id')
      .notNull()
      .references(() => permissions.id, { onDelete: 'cascade' }),
  },
  (t) => [
    primaryKey({ columns: [t.roleId, t.permissionId] }),
    index('role_permissions_permission_id_idx').on(t.permissionId),
  ],
);

export const userRoles = pgTable(
  'user_roles',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    roleId: uuid('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'cascade' }),
    /** Scope: org context for org-scoped roles; null for system roles (provisional). */
    organizationId: uuid('organization_id').references(() => organizations.id, {
      onDelete: 'cascade',
    }),
    assignedAt: timestamp('assigned_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex('user_roles_user_role_org_uidx').on(
      t.userId,
      t.roleId,
      t.organizationId,
    ),
    index('user_roles_organization_id_idx').on(t.organizationId),
  ],
);

export const refreshTokens = pgTable(
  'refresh_tokens',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: varchar('token_hash', { length: 128 }).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    userAgent: text('user_agent'),
    ipAddress: varchar('ip_address', { length: 45 }),
  },
  (t) => [
    uniqueIndex('refresh_tokens_token_hash_uidx').on(t.tokenHash),
    index('refresh_tokens_user_id_idx').on(t.userId),
  ],
);

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id').references(() => organizations.id, {
      onDelete: 'set null',
    }),
    userId: uuid('user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    action: varchar('action', { length: 120 }).notNull(),
    resourceType: varchar('resource_type', { length: 64 }),
    resourceId: varchar('resource_id', { length: 64 }),
    status: varchar('status', { length: 32 }).notNull().default('SUCCESS'),
    metadata: jsonb('metadata'),
    ipAddress: varchar('ip_address', { length: 45 }),
    correlationId: varchar('correlation_id', { length: 64 }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('audit_logs_organization_id_idx').on(t.organizationId),
    index('audit_logs_user_id_idx').on(t.userId),
    index('audit_logs_created_at_idx').on(t.createdAt),
  ],
);

export const organizationsRelations = relations(organizations, ({ many }) => ({
  memberships: many(memberships),
  companies: many(companies),
  roles: many(roles),
}));

export const usersRelations = relations(users, ({ many }) => ({
  memberships: many(memberships),
  userRoles: many(userRoles),
  refreshTokens: many(refreshTokens),
}));
