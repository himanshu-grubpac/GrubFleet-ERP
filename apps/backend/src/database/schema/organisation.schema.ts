import { relations } from 'drizzle-orm';

import {
  boolean,
  date,
  index,
  integer,
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

export const organisationSupplierTypeEnum = pgEnum(
  'organisation_supplier_type',
  ['bike', 'driver', 'spare_parts', 'compliance'],
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

export const organisationSuppliers = pgTable(
  'organisation_suppliers',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id').notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    supplierType: organisationSupplierTypeEnum('supplier_type').notNull(),
    contactPerson: varchar('contact_person', { length: 255 }).notNull(),
    contactPhone: varchar('contact_phone', { length: 32 }).notNull(),
    contactEmail: varchar('contact_email', { length: 320 }).notNull(),
    agreementReference: varchar('agreement_reference', { length: 120 }),
    addressLine1: varchar('address_line1', { length: 255 }).notNull(),
    addressLine2: varchar('address_line2', { length: 255 }),
    addressCity: varchar('address_city', { length: 120 }),
    addressState: varchar('address_state', { length: 120 }),
    addressDistrict: varchar('address_district', { length: 120 }),
    addressPincode: varchar('address_pincode', { length: 20 }),
    addressCountry: varchar('address_country', { length: 2 })
      .notNull()
      .default('IN'),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('organisation_suppliers_organization_id_idx').on(t.organizationId),
    index('organisation_suppliers_org_active_idx').on(
      t.organizationId,
      t.isActive,
    ),
    index('organisation_suppliers_org_type_idx').on(
      t.organizationId,
      t.supplierType,
    ),
    index('organisation_suppliers_name_idx').on(t.organizationId, t.name),
  ],
);

export const organisationDrivers = pgTable(
  'organisation_drivers',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id').notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    cprNo: varchar('cpr_no', { length: 20 }).notNull(),
    phone: varchar('phone', { length: 32 }).notNull(),
    email: varchar('email', { length: 320 }).notNull(),
    licenseNumber: varchar('license_number', { length: 64 }).notNull(),
    licenseExpiry: date('license_expiry').notNull(),
    supplierId: uuid('supplier_id').notNull(),
    addressLine1: varchar('address_line1', { length: 255 }).notNull(),
    addressLine2: varchar('address_line2', { length: 255 }),
    addressCity: varchar('address_city', { length: 120 }),
    addressState: varchar('address_state', { length: 120 }),
    addressDistrict: varchar('address_district', { length: 120 }),
    addressPincode: varchar('address_pincode', { length: 20 }),
    addressCountry: varchar('address_country', { length: 2 })
      .notNull()
      .default('IN'),
    assignedVehicleCode: varchar('assigned_vehicle_code', { length: 64 }),
    assignedVehicleAssetClass: varchar('assigned_vehicle_asset_class', {
      length: 255,
    }),
    assignedActiveLeaseId: varchar('assigned_active_lease_id', { length: 64 }),
    vehicleTiedToContract: boolean('vehicle_tied_to_contract')
      .notNull()
      .default(false),
    isActive: boolean('is_active').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('organisation_drivers_organization_id_idx').on(t.organizationId),
    index('organisation_drivers_org_active_idx').on(
      t.organizationId,
      t.isActive,
    ),
    index('organisation_drivers_org_supplier_idx').on(
      t.organizationId,
      t.supplierId,
    ),
    index('organisation_drivers_license_expiry_idx').on(
      t.organizationId,
      t.licenseExpiry,
    ),
    uniqueIndex('organisation_drivers_org_cpr_uidx').on(
      t.organizationId,
      t.cprNo,
    ),
    index('organisation_drivers_name_idx').on(t.organizationId, t.name),
  ],
);

export const organisationDriversRelations = relations(
  organisationDrivers,
  ({ one }) => ({
    supplier: one(organisationSuppliers, {
      fields: [organisationDrivers.supplierId],
      references: [organisationSuppliers.id],
    }),
  }),
);

/** Organisation client register (Decision E — separate from fleet_clients). */
export const organisationClients = pgTable(
  'organisation_clients',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id').notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    addressLine1: varchar('address_line1', { length: 255 }).notNull(),
    addressLine2: varchar('address_line2', { length: 255 }),
    addressCity: varchar('address_city', { length: 120 }),
    addressState: varchar('address_state', { length: 120 }),
    addressDistrict: varchar('address_district', { length: 120 }),
    addressPincode: varchar('address_pincode', { length: 20 }),
    addressCountry: varchar('address_country', { length: 2 })
      .notNull()
      .default('IN'),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('organisation_clients_organization_id_idx').on(t.organizationId),
    index('organisation_clients_org_active_idx').on(
      t.organizationId,
      t.isActive,
    ),
    index('organisation_clients_name_idx').on(t.organizationId, t.name),
  ],
);

export const organisationClientPocs = pgTable(
  'organisation_client_pocs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    clientId: uuid('client_id')
      .notNull()
      .references(() => organisationClients.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    contactNumber: varchar('contact_number', { length: 32 }).notNull(),
    email: varchar('email', { length: 320 }).notNull(),
    isPrimary: boolean('is_primary').notNull().default(false),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('organisation_client_pocs_client_id_idx').on(t.clientId),
    index('organisation_client_pocs_name_idx').on(t.name),
    index('organisation_client_pocs_email_idx').on(t.email),
  ],
);

export const organisationClientsRelations = relations(
  organisationClients,
  ({ many }) => ({
    pointsOfContact: many(organisationClientPocs),
  }),
);

export const organisationClientPocsRelations = relations(
  organisationClientPocs,
  ({ one }) => ({
    client: one(organisationClients, {
      fields: [organisationClientPocs.clientId],
      references: [organisationClients.id],
    }),
  }),
);
