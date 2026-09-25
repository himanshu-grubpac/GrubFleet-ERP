import { relations } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

/** Flow 00 + Figma list/detail (Completed → closed/concluded). */
export const leaseContractStatusEnum = pgEnum('lease_contract_status', [
  'draft',
  'pending_approval',
  'approved',
  'active',
  'awaiting_assets',
  'deactivated',
  'billing_paused',
  'pending_termination',
  'closed',
  'concluded',
]);

export const fleetBillingFrequencyEnum = pgEnum('fleet_billing_frequency', [
  'monthly',
  'quarterly',
  'annual',
]);

export const fleetVehicleStatusEnum = pgEnum('fleet_vehicle_status', [
  'available',
  'inbound',
  'reserved',
  'leased',
  'returned',
  'workshop',
  'sold',
  'retired',
]);

export const fleetApprovalSourceTypeEnum = pgEnum(
  'fleet_approval_source_type',
  ['contract_rate_exception', 'contract_termination'],
);

export const fleetApprovalStatusEnum = pgEnum('fleet_approval_status', [
  'pending',
  'approved',
  'rejected',
]);

/** Customer / Client Register (Organisation TSV, Flow 39). */
export const fleetClients = pgTable(
  'fleet_clients',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id').notNull(),
    clientCode: varchar('client_code', { length: 32 }).notNull(),
    companyName: varchar('company_name', { length: 255 }).notNull(),
    address: text('address'),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex('fleet_clients_org_code_uidx').on(
      t.organizationId,
      t.clientCode,
    ),
    index('fleet_clients_organization_id_idx').on(t.organizationId),
    index('fleet_clients_company_name_idx').on(t.companyName),
  ],
);

/** Points of contact — one client, many POCs; exactly one primary (Organisation + wizard UI). */
export const fleetClientPocs = pgTable(
  'fleet_client_pocs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    clientId: uuid('client_id')
      .notNull()
      .references(() => fleetClients.id, { onDelete: 'cascade' }),
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
    index('fleet_client_pocs_client_id_idx').on(t.clientId),
    index('fleet_client_pocs_name_idx').on(t.name),
    index('fleet_client_pocs_email_idx').on(t.email),
  ],
);

/** Vehicle Master (Asset Register TSV subset for leasing gates). */
export const fleetVehicles = pgTable(
  'fleet_vehicles',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id').notNull(),
    vin: varchar('vin', { length: 64 }).notNull(),
    registrationNo: varchar('registration_no', { length: 32 }).notNull(),
    registrationExpiry: timestamp('registration_expiry', {
      withTimezone: true,
    }).notNull(),
    insuranceExpiry: timestamp('insurance_expiry', {
      withTimezone: true,
    }).notNull(),
    odometer: integer('odometer').notNull().default(0),
    assetClass: varchar('asset_class', { length: 64 }).notNull(),
    location: varchar('location', { length: 120 }),
    status: fleetVehicleStatusEnum('status').notNull().default('available'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex('fleet_vehicles_org_reg_uidx').on(
      t.organizationId,
      t.registrationNo,
    ),
    index('fleet_vehicles_organization_id_idx').on(t.organizationId),
    index('fleet_vehicles_status_idx').on(t.status),
    index('fleet_vehicles_asset_class_idx').on(t.assetClass),
  ],
);

export const leaseContracts = pgTable(
  'lease_contracts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id').notNull(),
    contractNumber: varchar('contract_number', { length: 32 }).notNull(),
    clientId: uuid('client_id').references(() => fleetClients.id, {
      onDelete: 'restrict',
    }),
    status: leaseContractStatusEnum('status').notNull().default('draft'),
    startDate: timestamp('start_date', { withTimezone: true }),
    endDate: timestamp('end_date', { withTimezone: true }),
    termMonths: integer('term_months'),
    securityDeposit: numeric('security_deposit', { precision: 14, scale: 2 }),
    billingFrequency: fleetBillingFrequencyEnum('billing_frequency')
      .notNull()
      .default('monthly'),
    additionalTerms: text('additional_terms'),
    amcTier: varchar('amc_tier', { length: 120 }),
    awaitingFutureAssets: boolean('awaiting_future_assets')
      .notNull()
      .default(false),
    billingPaused: boolean('billing_paused').notNull().default(false),
    /** Billing continues after deactivate until all vehicles returned & registered. */
    onHold: boolean('on_hold').notNull().default(false),
    rateRequiresApproval: boolean('rate_requires_approval')
      .notNull()
      .default(false),
    description: text('description'),
    /** Flow 04 — renewal draft links to prior contract. */
    renewedFromContractId: uuid('renewed_from_contract_id'),
    /** Flow 03 — set when a material edit is logged. */
    requiresEditReview: boolean('requires_edit_review')
      .notNull()
      .default(false),
    createdByUserId: uuid('created_by_user_id'),
    updatedByUserId: uuid('updated_by_user_id'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex('lease_contracts_org_number_uidx').on(
      t.organizationId,
      t.contractNumber,
    ),
    index('lease_contracts_organization_id_idx').on(t.organizationId),
    index('lease_contracts_status_idx').on(t.status),
    index('lease_contracts_client_id_idx').on(t.clientId),
  ],
);

/** Figma asset-class lines (committed qty + rate per vehicle/month). */
export const leaseContractAssetLines = pgTable(
  'lease_contract_asset_lines',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    contractId: uuid('contract_id')
      .notNull()
      .references(() => leaseContracts.id, { onDelete: 'cascade' }),
    assetClass: varchar('asset_class', { length: 64 }).notNull(),
    committedQuantity: integer('committed_quantity').notNull(),
    ratePerVehicleMonth: numeric('rate_per_vehicle_month', {
      precision: 14,
      scale: 2,
    }).notNull(),
    /** UI "Covered" when fleet pool can satisfy committed qty. */
    availabilityCovered: boolean('availability_covered')
      .notNull()
      .default(false),
    availabilityStatus: varchar('availability_status', { length: 32 })
      .notNull()
      .default('covered'),
    availableNowCount: integer('available_now_count').notNull().default(0),
    inboundCount: integer('inbound_count').notNull().default(0),
    shortfallCount: integer('shortfall_count').notNull().default(0),
    awaitingAssetsLine: boolean('awaiting_assets_line')
      .notNull()
      .default(false),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('lease_contract_asset_lines_contract_id_idx').on(t.contractId),
    uniqueIndex('lease_contract_asset_lines_contract_class_uidx').on(
      t.contractId,
      t.assetClass,
    ),
  ],
);

/** TSV Vehicle(s) multi-select on contract. */
export const leaseContractVehicles = pgTable(
  'lease_contract_vehicles',
  {
    contractId: uuid('contract_id')
      .notNull()
      .references(() => leaseContracts.id, { onDelete: 'cascade' }),
    vehicleId: uuid('vehicle_id')
      .notNull()
      .references(() => fleetVehicles.id, { onDelete: 'restrict' }),
    assignedAt: timestamp('assigned_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex('lease_contract_vehicles_contract_vehicle_uidx').on(
      t.contractId,
      t.vehicleId,
    ),
    index('lease_contract_vehicles_vehicle_id_idx').on(t.vehicleId),
  ],
);

export const leaseContractEvents = pgTable(
  'lease_contract_events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    contractId: uuid('contract_id')
      .notNull()
      .references(() => leaseContracts.id, { onDelete: 'cascade' }),
    organizationId: uuid('organization_id').notNull(),
    eventType: varchar('event_type', { length: 64 }).notNull(),
    message: text('message').notNull(),
    actorUserId: uuid('actor_user_id'),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('lease_contract_events_contract_id_idx').on(t.contractId),
    index('lease_contract_events_created_at_idx').on(t.createdAt),
  ],
);

export const fleetVehicleAllocations = pgTable(
  'fleet_vehicle_allocations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id').notNull(),
    contractId: uuid('contract_id')
      .notNull()
      .references(() => leaseContracts.id, { onDelete: 'cascade' }),
    vehicleId: uuid('vehicle_id')
      .notNull()
      .references(() => fleetVehicles.id, { onDelete: 'restrict' }),
    reassignmentConfirmation: text('reassignment_confirmation'),
    notifiedStakeholders: jsonb('notified_stakeholders'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('fleet_vehicle_allocations_contract_id_idx').on(t.contractId),
    index('fleet_vehicle_allocations_vehicle_id_idx').on(t.vehicleId),
  ],
);

/** Asset Register damage stub until Asset module ships (Flow 06 optional link). */
export const fleetDamageRecords = pgTable(
  'fleet_damage_records',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id').notNull(),
    summary: varchar('summary', { length: 255 }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('fleet_damage_records_organization_id_idx').on(t.organizationId),
  ],
);

/** Flow 03 — per-edit field diff audit. */
export const leaseContractEditLogs = pgTable(
  'lease_contract_edit_logs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id').notNull(),
    contractId: uuid('contract_id')
      .notNull()
      .references(() => leaseContracts.id, { onDelete: 'cascade' }),
    actorUserId: uuid('actor_user_id'),
    classification: varchar('classification', { length: 32 })
      .notNull()
      .default('clerical'),
    changedFields: jsonb('changed_fields').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('lease_contract_edit_logs_contract_id_idx').on(t.contractId),
    index('lease_contract_edit_logs_organization_id_idx').on(t.organizationId),
  ],
);

export const fleetReturnInspections = pgTable(
  'fleet_return_inspections',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id').notNull(),
    contractId: uuid('contract_id')
      .notNull()
      .references(() => leaseContracts.id, { onDelete: 'cascade' }),
    vehicleId: uuid('vehicle_id')
      .notNull()
      .references(() => fleetVehicles.id, { onDelete: 'restrict' }),
    odometerReading: integer('odometer_reading').notNull(),
    conditionChecklist: jsonb('condition_checklist').notNull(),
    damageRecordId: uuid('damage_record_id'),
    /** Logged as physically back — not fully inspected (Figma footer). */
    registeredReturn: boolean('registered_return').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('fleet_return_inspections_contract_id_idx').on(t.contractId),
    uniqueIndex('fleet_return_inspections_contract_vehicle_uidx').on(
      t.contractId,
      t.vehicleId,
    ),
  ],
);

export const fleetApprovalRequests = pgTable(
  'fleet_approval_requests',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id').notNull(),
    contractId: uuid('contract_id')
      .notNull()
      .references(() => leaseContracts.id, { onDelete: 'cascade' }),
    sourceType: fleetApprovalSourceTypeEnum('source_type').notNull(),
    status: fleetApprovalStatusEnum('status').notNull().default('pending'),
    requestedByUserId: uuid('requested_by_user_id').notNull(),
    resolvedByUserId: uuid('resolved_by_user_id'),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('fleet_approval_requests_contract_id_idx').on(t.contractId),
    index('fleet_approval_requests_status_idx').on(t.status),
  ],
);

export const fleetClientsRelations = relations(fleetClients, ({ many }) => ({
  contracts: many(leaseContracts),
  pointsOfContact: many(fleetClientPocs),
}));

export const fleetClientPocsRelations = relations(
  fleetClientPocs,
  ({ one }) => ({
    client: one(fleetClients, {
      fields: [fleetClientPocs.clientId],
      references: [fleetClients.id],
    }),
  }),
);

export const leaseContractsRelations = relations(
  leaseContracts,
  ({ one, many }) => ({
    client: one(fleetClients, {
      fields: [leaseContracts.clientId],
      references: [fleetClients.id],
    }),
    assetLines: many(leaseContractAssetLines),
    contractVehicles: many(leaseContractVehicles),
    events: many(leaseContractEvents),
  }),
);
