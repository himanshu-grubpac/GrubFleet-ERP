import { relations } from 'drizzle-orm';
import {
  boolean,
  index,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

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

export const organisationLocationsRelations = relations(
  organisationLocations,
  ({ one }) => ({
    locationType: one(organisationLocationTypes, {
      fields: [organisationLocations.locationTypeId],
      references: [organisationLocationTypes.id],
    }),
  }),
);
