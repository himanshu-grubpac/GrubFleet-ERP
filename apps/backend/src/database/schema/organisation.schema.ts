import { relations } from 'drizzle-orm';

import {
  boolean,
  date,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

export const organisationEmploymentTypeEnum = pgEnum(
  'organisation_employment_type',
  ['full_time', 'part_time', 'contract'],
);

export const organisationOffBoardReasonEnum = pgEnum(
  'organisation_off_board_reason_type',
  ['resignation', 'termination', 'end_of_contract', 'other'],
);

export const organisationLocationTypes = pgTable(
  'organisation_location_types',

  {
    id: uuid('id').defaultRandom().primaryKey(),

    organizationId: uuid('organization_id').notNull(),

    name: varchar('name', { length: 120 }).notNull(),

    /** Stable key for seeded system presets (office, workshop, …). */

    presetKey: varchar('preset_key', { length: 64 }),

    isSystem: boolean('is_system').notNull().default(false),

    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()

      .defaultNow(),

    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()

      .defaultNow(),
  },

  (t) => [
    uniqueIndex('organisation_location_types_org_name_uidx').on(
      t.organizationId,

      t.name,
    ),

    uniqueIndex('organisation_location_types_org_preset_uidx').on(
      t.organizationId,

      t.presetKey,
    ),

    index('organisation_location_types_organization_id_idx').on(
      t.organizationId,
    ),
  ],
);

export const organisationLocations = pgTable(
  'organisation_locations',

  {
    id: uuid('id').defaultRandom().primaryKey(),

    organizationId: uuid('organization_id').notNull(),

    name: varchar('name', { length: 255 }).notNull(),

    locationTypeId: uuid('location_type_id')
      .notNull()

      .references(() => organisationLocationTypes.id, { onDelete: 'restrict' }),

    addressLine1: varchar('address_line1', { length: 255 }).notNull(),

    addressLine2: varchar('address_line2', { length: 255 }),

    addressCity: varchar('address_city', { length: 120 }),

    addressState: varchar('address_state', { length: 120 }),

    addressDistrict: varchar('address_district', { length: 120 }),

    addressPincode: varchar('address_pincode', { length: 20 }),

    /** ISO 3166-1 alpha-2 (e.g. IN, US, AE). Existing rows default IN. */
    addressCountry: varchar('address_country', { length: 2 })
      .notNull()
      .default('IN'),

    siteContactPhone: varchar('site_contact_phone', { length: 32 }),

    siteContactEmail: varchar('site_contact_email', { length: 320 }),

    responsibleEmployeeId: uuid('responsible_employee_id'),

    deputyEmployeeId: uuid('deputy_employee_id'),

    isActive: boolean('is_active').notNull().default(true),

    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()

      .defaultNow(),

    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()

      .defaultNow(),
  },

  (t) => [
    index('organisation_locations_organization_id_idx').on(t.organizationId),

    index('organisation_locations_org_active_idx').on(
      t.organizationId,

      t.isActive,
    ),

    index('organisation_locations_location_type_id_idx').on(t.locationTypeId),

    index('organisation_locations_name_idx').on(t.organizationId, t.name),
  ],
);

export const organisationLocationTypesRelations = relations(
  organisationLocationTypes,

  ({ many }) => ({
    locations: many(organisationLocations),
  }),
);

export const organisationEmployees = pgTable(
  'organisation_employees',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id').notNull(),
    employeeCode: varchar('employee_code', { length: 64 }),
    fullName: varchar('full_name', { length: 255 }).notNull(),
    designation: varchar('designation', { length: 255 }),
    department: varchar('department', { length: 120 }),
    departmentId: uuid('department_id'),
    branchLocationLabel: varchar('branch_location_label', { length: 255 }),
    locationId: uuid('location_id').references(() => organisationLocations.id, {
      onDelete: 'set null',
    }),
    employmentType: organisationEmploymentTypeEnum('employment_type')
      .notNull()
      .default('full_time'),
    dateOfJoining: date('date_of_joining'),
    companyEmail: varchar('company_email', { length: 320 }),
    mobile: varchar('mobile', { length: 32 }),
    reportsToEmployeeId: uuid('reports_to_employee_id'),
    reportsToDesignationOverride: varchar('reports_to_designation_override', {
      length: 255,
    }),
    reportsToLocationOverride: varchar('reports_to_location_override', {
      length: 255,
    }),
    linkedUserId: uuid('linked_user_id'),
    isActive: boolean('is_active').notNull().default(true),
    offBoardReasonType: organisationOffBoardReasonEnum('off_board_reason_type'),
    offBoardComment: text('off_board_comment'),
    offBoardedAt: timestamp('off_boarded_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('organisation_employees_organization_id_idx').on(t.organizationId),
    index('organisation_employees_org_active_idx').on(
      t.organizationId,
      t.isActive,
    ),
    index('organisation_employees_full_name_idx').on(
      t.organizationId,
      t.fullName,
    ),
  ],
);

export const organisationLocationsRelations = relations(
  organisationLocations,

  ({ one }) => ({
    locationType: one(organisationLocationTypes, {
      fields: [organisationLocations.locationTypeId],

      references: [organisationLocationTypes.id],
    }),
    responsibleEmployee: one(organisationEmployees, {
      fields: [organisationLocations.responsibleEmployeeId],
      references: [organisationEmployees.id],
      relationName: 'locationResponsibleEmployee',
    }),
    deputyEmployee: one(organisationEmployees, {
      fields: [organisationLocations.deputyEmployeeId],
      references: [organisationEmployees.id],
      relationName: 'locationDeputyEmployee',
    }),
  }),
);

export const organisationEmployeesRelations = relations(
  organisationEmployees,
  ({ one }) => ({
    reportsTo: one(organisationEmployees, {
      fields: [organisationEmployees.reportsToEmployeeId],
      references: [organisationEmployees.id],
      relationName: 'employeeReportsTo',
    }),
    branchLocation: one(organisationLocations, {
      fields: [organisationEmployees.locationId],
      references: [organisationLocations.id],
    }),
  }),
);
