import { relations } from 'drizzle-orm';
import {
  bigint,
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { assetRegisterVehicles } from './asset-register.schema';
import { inventoryCatalogParts } from './finance.schema';
import { organisationEmployees } from './organisation.schema';

export const workshopWorkOrderStatusEnum = pgEnum(
  'workshop_work_order_status',
  ['open', 'in_progress', 'closed', 'cancelled'],
);

export const workshopWorkOrderPartLineSourceEnum = pgEnum(
  'workshop_work_order_part_line_source',
  ['template', 'additional'],
);

export const workshopWorkOrderLaborLineSourceEnum = pgEnum(
  'workshop_work_order_labor_line_source',
  ['template', 'additional'],
);

export const workshopWorkOrderPartFulfillmentStatusEnum = pgEnum(
  'workshop_work_order_part_fulfillment_status',
  ['reserved', 'issued', 'cancelled'],
);

export const workshopWorkOrderTypeEnum = pgEnum('workshop_work_order_type', [
  'general',
  'pm',
  'return_inspection',
]);

export const workshopWorkOrderSourceEnum = pgEnum(
  'workshop_work_order_source',
  ['manual', 'maintenance_schedule', 'lease_return'],
);

/** Saved labor job card templates (parts + labor charge). */
export const workshopLaborJobCards = pgTable(
  'workshop_labor_job_cards',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id').notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    laborChargeMinor: bigint('labor_charge_minor', { mode: 'number' })
      .notNull()
      .default(0),
    isActive: boolean('is_active').notNull().default(true),
    deactivateReason: text('deactivate_reason'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('workshop_labor_job_cards_organization_id_idx').on(t.organizationId),
    index('workshop_labor_job_cards_org_active_idx').on(
      t.organizationId,
      t.isActive,
    ),
    uniqueIndex('workshop_labor_job_cards_org_name_uidx').on(
      t.organizationId,
      t.name,
    ),
  ],
);

export const workshopLaborJobCardParts = pgTable(
  'workshop_labor_job_card_parts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    laborJobCardId: uuid('labor_job_card_id')
      .notNull()
      .references(() => workshopLaborJobCards.id, { onDelete: 'cascade' }),
    inventoryPartId: uuid('inventory_part_id')
      .notNull()
      .references(() => inventoryCatalogParts.id, { onDelete: 'restrict' }),
    quantity: integer('quantity').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex('workshop_labor_job_card_parts_card_part_uidx').on(
      t.laborJobCardId,
      t.inventoryPartId,
    ),
    index('workshop_labor_job_card_parts_part_id_idx').on(t.inventoryPartId),
  ],
);

export const workshopWorkOrderNumberSequences = pgTable(
  'workshop_work_order_number_sequences',
  {
    organizationId: uuid('organization_id').notNull(),
    year: integer('year').notNull(),
    lastSeq: integer('last_seq').notNull().default(0),
  },
  (t) => [
    uniqueIndex('workshop_work_order_number_sequences_org_year_uidx').on(
      t.organizationId,
      t.year,
    ),
  ],
);

export const workshopWorkOrders = pgTable(
  'workshop_work_orders',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id').notNull(),
    workOrderNumber: varchar('work_order_number', { length: 32 }).notNull(),
    status: workshopWorkOrderStatusEnum('status').notNull().default('open'),
    workOrderType: workshopWorkOrderTypeEnum('work_order_type')
      .notNull()
      .default('general'),
    workOrderSource: workshopWorkOrderSourceEnum('work_order_source')
      .notNull()
      .default('manual'),
    maintenanceScheduleId: uuid('maintenance_schedule_id').references(
      () => workshopMaintenanceSchedules.id,
      { onDelete: 'set null' },
    ),
    conditionChecklist: jsonb('condition_checklist'),
    vehicleId: uuid('vehicle_id')
      .notNull()
      .references(() => assetRegisterVehicles.id, { onDelete: 'restrict' }),
    laborJobCardId: uuid('labor_job_card_id').references(
      () => workshopLaborJobCards.id,
      { onDelete: 'set null' },
    ),
    technicianEmployeeId: uuid('technician_employee_id').references(
      () => organisationEmployees.id,
      { onDelete: 'set null' },
    ),
    expectedCompletionDate: date('expected_completion_date'),
    reportedBy: varchar('reported_by', { length: 255 }),
    odometerReading: integer('odometer_reading'),
    issueDescription: text('issue_description'),
    notes: text('notes'),
    partsTotalMinor: bigint('parts_total_minor', { mode: 'number' })
      .notNull()
      .default(0),
    laborTotalMinor: bigint('labor_total_minor', { mode: 'number' })
      .notNull()
      .default(0),
    netTotalMinor: bigint('net_total_minor', { mode: 'number' })
      .notNull()
      .default(0),
    closedAt: timestamp('closed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex('workshop_work_orders_org_number_uidx').on(
      t.organizationId,
      t.workOrderNumber,
    ),
    index('workshop_work_orders_organization_id_idx').on(t.organizationId),
    index('workshop_work_orders_org_status_idx').on(t.organizationId, t.status),
    index('workshop_work_orders_vehicle_id_idx').on(t.vehicleId),
    index('workshop_work_orders_technician_id_idx').on(t.technicianEmployeeId),
    index('workshop_work_orders_expected_completion_idx').on(
      t.organizationId,
      t.expectedCompletionDate,
    ),
    index('workshop_work_orders_org_pm_schedule_vehicle_idx').on(
      t.organizationId,
      t.maintenanceScheduleId,
      t.vehicleId,
      t.workOrderType,
      t.status,
    ),
  ],
);

export const workshopWorkOrderPartLines = pgTable(
  'workshop_work_order_part_lines',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    workOrderId: uuid('work_order_id')
      .notNull()
      .references(() => workshopWorkOrders.id, { onDelete: 'cascade' }),
    inventoryPartId: uuid('inventory_part_id')
      .notNull()
      .references(() => inventoryCatalogParts.id, { onDelete: 'restrict' }),
    quantity: integer('quantity').notNull(),
    unitCostMinor: bigint('unit_cost_minor', { mode: 'number' }).notNull(),
    lineSource: workshopWorkOrderPartLineSourceEnum('line_source').notNull(),
    fulfillmentStatus: workshopWorkOrderPartFulfillmentStatusEnum(
      'fulfillment_status',
    )
      .notNull()
      .default('reserved'),
    inventoryPartsRequestId: uuid('inventory_parts_request_id'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('workshop_work_order_part_lines_work_order_id_idx').on(t.workOrderId),
  ],
);

export const workshopWorkOrderLaborLines = pgTable(
  'workshop_work_order_labor_lines',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    workOrderId: uuid('work_order_id')
      .notNull()
      .references(() => workshopWorkOrders.id, { onDelete: 'cascade' }),
    description: varchar('description', { length: 255 }).notNull(),
    amountMinor: bigint('amount_minor', { mode: 'number' }).notNull(),
    lineSource: workshopWorkOrderLaborLineSourceEnum('line_source').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('workshop_work_order_labor_lines_work_order_id_idx').on(
      t.workOrderId,
    ),
  ],
);

export const workshopWorkOrderOverdueLogs = pgTable(
  'workshop_work_order_overdue_logs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    workOrderId: uuid('work_order_id')
      .notNull()
      .references(() => workshopWorkOrders.id, { onDelete: 'cascade' }),
    loggedAt: timestamp('logged_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    expectedCompletionDate: date('expected_completion_date').notNull(),
    daysOverdue: integer('days_overdue').notNull(),
    note: text('note'),
  },
  (t) => [
    index('workshop_work_order_overdue_logs_work_order_id_idx').on(
      t.workOrderId,
    ),
  ],
);

/** AMC maintenance tiers (workshop catalog). */
export const workshopAmcTiers = pgTable(
  'workshop_amc_tiers',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id').notNull(),
    name: varchar('name', { length: 120 }).notNull(),
    description: text('description'),
    priceDisplayLabel: varchar('price_display_label', { length: 120 }),
    subscriberCount: integer('subscriber_count').notNull().default(0),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('workshop_amc_tiers_organization_id_idx').on(t.organizationId),
    uniqueIndex('workshop_amc_tiers_org_name_uidx').on(
      t.organizationId,
      t.name,
    ),
  ],
);

/** Preventive maintenance schedule definitions. */
export const workshopMaintenanceSchedules = pgTable(
  'workshop_maintenance_schedules',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id').notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    assetClassLabel: varchar('asset_class_label', { length: 255 }),
    intervalLabel: varchar('interval_label', { length: 120 }),
    maintenanceType: varchar('maintenance_type', { length: 64 }),
    intervalType: varchar('interval_type', { length: 32 }),
    vehicleApplicability: varchar('vehicle_applicability', { length: 32 }),
    description: text('description'),
    vehicleCount: integer('vehicle_count').notNull().default(0),
    thresholdReachedCount: integer('threshold_reached_count')
      .notNull()
      .default(0),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('workshop_maintenance_schedules_organization_id_idx').on(
      t.organizationId,
    ),
    uniqueIndex('workshop_maintenance_schedules_org_name_uidx').on(
      t.organizationId,
      t.name,
    ),
  ],
);

/** Vehicle subscribed to an AMC tier (subscriber code = fleet code). */
export const workshopAmcSubscribers = pgTable(
  'workshop_amc_subscribers',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id').notNull(),
    amcTierId: uuid('amc_tier_id')
      .notNull()
      .references(() => workshopAmcTiers.id, { onDelete: 'restrict' }),
    vehicleId: uuid('vehicle_id')
      .notNull()
      .references(() => assetRegisterVehicles.id, { onDelete: 'restrict' }),
    subscriberCode: varchar('subscriber_code', { length: 64 }).notNull(),
    isActive: boolean('is_active').notNull().default(true),
    startedAt: date('started_at'),
    endedAt: date('ended_at'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('workshop_amc_subscribers_organization_id_idx').on(t.organizationId),
    index('workshop_amc_subscribers_tier_id_idx').on(t.amcTierId),
    uniqueIndex('workshop_amc_subscribers_org_code_uidx').on(
      t.organizationId,
      t.subscriberCode,
    ),
    uniqueIndex('workshop_amc_subscribers_org_vehicle_tier_uidx').on(
      t.organizationId,
      t.amcTierId,
      t.vehicleId,
    ),
  ],
);

export type WorkshopLaborJobCardRow = typeof workshopLaborJobCards.$inferSelect;
export type WorkshopWorkOrderRow = typeof workshopWorkOrders.$inferSelect;

export const workshopLaborJobCardsRelations = relations(
  workshopLaborJobCards,
  ({ many }) => ({
    parts: many(workshopLaborJobCardParts),
  }),
);

export const workshopLaborJobCardPartsRelations = relations(
  workshopLaborJobCardParts,
  ({ one }) => ({
    laborJobCard: one(workshopLaborJobCards, {
      fields: [workshopLaborJobCardParts.laborJobCardId],
      references: [workshopLaborJobCards.id],
    }),
    inventoryPart: one(inventoryCatalogParts, {
      fields: [workshopLaborJobCardParts.inventoryPartId],
      references: [inventoryCatalogParts.id],
    }),
  }),
);

export const workshopWorkOrdersRelations = relations(
  workshopWorkOrders,
  ({ many, one }) => ({
    partLines: many(workshopWorkOrderPartLines),
    laborLines: many(workshopWorkOrderLaborLines),
    overdueLogs: many(workshopWorkOrderOverdueLogs),
    vehicle: one(assetRegisterVehicles, {
      fields: [workshopWorkOrders.vehicleId],
      references: [assetRegisterVehicles.id],
    }),
    laborJobCard: one(workshopLaborJobCards, {
      fields: [workshopWorkOrders.laborJobCardId],
      references: [workshopLaborJobCards.id],
    }),
    technician: one(organisationEmployees, {
      fields: [workshopWorkOrders.technicianEmployeeId],
      references: [organisationEmployees.id],
    }),
  }),
);
