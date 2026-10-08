import {
  boolean,
  date,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
export const assetRegisterVehicleTypeEnum = pgEnum(
  'asset_register_vehicle_type',
  ['2W', '3W', '4W'],
);

export const assetRegisterAssetClasses = pgTable(
  'asset_register_asset_classes',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id').notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    description: varchar('description', { length: 2000 }),
    code: varchar('code', { length: 8 }).notNull(),
    vehicleType: assetRegisterVehicleTypeEnum('vehicle_type').notNull(),
    fuelType: varchar('fuel_type', { length: 64 }).notNull(),
    mileageFrom: numeric('mileage_from', { precision: 10, scale: 2 }),
    mileageTo: numeric('mileage_to', { precision: 10, scale: 2 }),
    mileageUnit: varchar('mileage_unit', { length: 32 }),
    fuelTankCapacity: numeric('fuel_tank_capacity', {
      precision: 10,
      scale: 2,
    }).notNull(),
    ratedLoadFrom: numeric('rated_load_from', {
      precision: 12,
      scale: 2,
    }).notNull(),
    ratedLoadTo: numeric('rated_load_to', {
      precision: 12,
      scale: 2,
    }).notNull(),
    defaultIntakeChecklist: text('default_intake_checklist'),
    isActive: boolean('is_active').notNull().default(true),
    deactivatedAt: timestamp('deactivated_at', { withTimezone: true }),
    deactivateReason: varchar('deactivate_reason', { length: 500 }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex('asset_register_asset_classes_org_code_uidx').on(
      t.organizationId,
      t.code,
    ),
    index('asset_register_asset_classes_organization_id_idx').on(
      t.organizationId,
    ),
    index('asset_register_asset_classes_org_active_idx').on(
      t.organizationId,
      t.isActive,
    ),
    index('asset_register_asset_classes_name_idx').on(t.organizationId, t.name),
  ],
);

export type AssetRegisterAssetClassRow =
  typeof assetRegisterAssetClasses.$inferSelect;

export const assetRegisterAssetMasters = pgTable(
  'asset_register_asset_masters',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id').notNull(),
    assetClassId: uuid('asset_class_id').notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    isActive: boolean('is_active').notNull().default(true),
    deactivatedAt: timestamp('deactivated_at', { withTimezone: true }),
    deactivateReason: varchar('deactivate_reason', { length: 500 }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex('asset_register_asset_masters_org_class_name_uidx').on(
      t.organizationId,
      t.assetClassId,
      t.name,
    ),
    index('asset_register_asset_masters_organization_id_idx').on(
      t.organizationId,
    ),
    index('asset_register_asset_masters_asset_class_id_idx').on(t.assetClassId),
    index('asset_register_asset_masters_org_class_active_idx').on(
      t.organizationId,
      t.assetClassId,
      t.isActive,
    ),
    index('asset_register_asset_masters_name_idx').on(t.organizationId, t.name),
  ],
);

export type AssetRegisterAssetMasterRow =
  typeof assetRegisterAssetMasters.$inferSelect;

export const assetRegisterVehicleOperationalStatusEnum = pgEnum(
  'asset_register_vehicle_operational_status',
  ['available', 'leased', 'workshop', 'sold', 'retired'],
);

export const assetRegisterFleetCodeCounters = pgTable(
  'asset_register_fleet_code_counters',
  {
    organizationId: uuid('organization_id').primaryKey(),
    nextSequence: integer('next_sequence').notNull().default(1001),
  },
);

export const assetRegisterVehicles = pgTable(
  'asset_register_vehicles',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id').notNull(),
    assetClassId: uuid('asset_class_id').notNull(),
    assetMasterId: uuid('asset_master_id').notNull(),
    fleetCode: varchar('fleet_code', { length: 32 }).notNull(),
    registrationNumber: varchar('registration_number', {
      length: 32,
    }).notNull(),
    chassisNumber: varchar('chassis_number', { length: 64 }).notNull(),
    modelYear: integer('model_year').notNull(),
    odometer: integer('odometer').notNull().default(0),
    registrationStartDate: date('registration_start_date').notNull(),
    registrationEndDate: date('registration_end_date').notNull(),
    insuranceStartDate: date('insurance_start_date').notNull(),
    insuranceEndDate: date('insurance_end_date').notNull(),
    insurancePremium: numeric('insurance_premium', {
      precision: 14,
      scale: 2,
    }).notNull(),
    warrantyStartDate: date('warranty_start_date').notNull(),
    warrantyEndDate: date('warranty_end_date').notNull(),
    specialNotes: text('special_notes'),
    purchaseInvoiceId: uuid('purchase_invoice_id'),
    operationalStatus: assetRegisterVehicleOperationalStatusEnum(
      'operational_status',
    )
      .notNull()
      .default('available'),
    isActive: boolean('is_active').notNull().default(true),
    deactivatedAt: timestamp('deactivated_at', { withTimezone: true }),
    deactivateReason: varchar('deactivate_reason', { length: 500 }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex('asset_register_vehicles_org_fleet_code_uidx').on(
      t.organizationId,
      t.fleetCode,
    ),
    index('asset_register_vehicles_organization_id_idx').on(t.organizationId),
    index('asset_register_vehicles_asset_class_id_idx').on(t.assetClassId),
    index('asset_register_vehicles_asset_master_id_idx').on(t.assetMasterId),
    index('asset_register_vehicles_org_class_active_idx').on(
      t.organizationId,
      t.assetClassId,
      t.isActive,
    ),
    index('asset_register_vehicles_org_operational_status_idx').on(
      t.organizationId,
      t.operationalStatus,
    ),
    index('asset_register_vehicles_registration_number_idx').on(
      t.organizationId,
      t.registrationNumber,
    ),
  ],
);

export type AssetRegisterVehicleRow = typeof assetRegisterVehicles.$inferSelect;

export const assetRegisterVehicleAssignments = pgTable(
  'asset_register_vehicle_assignments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id').notNull(),
    vehicleId: uuid('vehicle_id')
      .notNull()
      .references(() => assetRegisterVehicles.id, { onDelete: 'restrict' }),
    leaseContractId: uuid('lease_contract_id').notNull(),
    fleetClientId: uuid('fleet_client_id'),
    organisationClientId: uuid('organisation_client_id'),
    assignedAt: timestamp('assigned_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    unassignedAt: timestamp('unassigned_at', { withTimezone: true }),
  },
  (t) => [
    index('asset_register_vehicle_assignments_organization_id_idx').on(
      t.organizationId,
    ),
    index('asset_register_vehicle_assignments_lease_contract_id_idx').on(
      t.leaseContractId,
    ),
    index('asset_register_vehicle_assignments_vehicle_id_idx').on(t.vehicleId),
  ],
);

export type AssetRegisterVehicleAssignmentRow =
  typeof assetRegisterVehicleAssignments.$inferSelect;
