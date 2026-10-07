import {
  bigint,
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
import { financeInvoices, inventoryCatalogParts } from './finance.schema';
import {
  organisationLocations,
  organisationSuppliers,
} from './organisation.schema';

export const inventoryPartsRequestStatusEnum = pgEnum(
  'inventory_parts_request_status',
  ['blocked', 'fulfilled', 'reserved', 'cancelled', 'lapsed'],
);

export const inventoryPartsRequestTypeEnum = pgEnum(
  'inventory_parts_request_type',
  ['internal', 'external'],
);

export const inventoryPartCodeSequences = pgTable(
  'inventory_part_code_sequences',
  {
    organizationId: uuid('organization_id').notNull(),
    lastSeq: integer('last_seq').notNull().default(0),
  },
  (t) => [
    uniqueIndex('inventory_part_code_sequences_org_uidx').on(t.organizationId),
  ],
);

export const inventoryStockReceipts = pgTable(
  'inventory_stock_receipts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id').notNull(),
    receiptNumber: varchar('receipt_number', { length: 32 }).notNull(),
    partId: uuid('part_id')
      .notNull()
      .references(() => inventoryCatalogParts.id, { onDelete: 'restrict' }),
    supplierId: uuid('supplier_id').references(() => organisationSuppliers.id, {
      onDelete: 'set null',
    }),
    locationId: uuid('location_id')
      .notNull()
      .references(() => organisationLocations.id, { onDelete: 'restrict' }),
    purchaseInvoiceReference: varchar('purchase_invoice_reference', {
      length: 255,
    }),
    financeInvoiceId: uuid('finance_invoice_id').references(
      () => financeInvoices.id,
      { onDelete: 'set null' },
    ),
    purchaseDate: date('purchase_date').notNull(),
    expiryDate: date('expiry_date'),
    quantityReceived: integer('quantity_received').notNull(),
    unitCostMinor: bigint('unit_cost_minor', { mode: 'number' }).notNull(),
    batchLotReference: varchar('batch_lot_reference', { length: 120 }),
    notes: text('notes'),
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
    uniqueIndex('inventory_stock_receipts_org_number_uidx').on(
      t.organizationId,
      t.receiptNumber,
    ),
    index('inventory_stock_receipts_org_part_idx').on(
      t.organizationId,
      t.partId,
    ),
    index('inventory_stock_receipts_org_location_idx').on(
      t.organizationId,
      t.locationId,
    ),
  ],
);

export const inventoryStockReceiptSequences = pgTable(
  'inventory_stock_receipt_sequences',
  {
    organizationId: uuid('organization_id').notNull(),
    year: integer('year').notNull(),
    lastSeq: integer('last_seq').notNull().default(0),
  },
  (t) => [
    uniqueIndex('inventory_stock_receipt_sequences_org_year_uidx').on(
      t.organizationId,
      t.year,
    ),
  ],
);

export const inventoryPartsRequests = pgTable(
  'inventory_parts_requests',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id').notNull(),
    requestNumber: varchar('request_number', { length: 32 }).notNull(),
    workOrderRef: varchar('work_order_ref', { length: 64 }).notNull(),
    partId: uuid('part_id')
      .notNull()
      .references(() => inventoryCatalogParts.id, { onDelete: 'restrict' }),
    locationId: uuid('location_id').references(() => organisationLocations.id, {
      onDelete: 'set null',
    }),
    quantityRequested: integer('quantity_requested').notNull(),
    requestType: inventoryPartsRequestTypeEnum('request_type')
      .notNull()
      .default('internal'),
    vehicleRef: varchar('vehicle_ref', { length: 64 }),
    status: inventoryPartsRequestStatusEnum('status')
      .notNull()
      .default('blocked'),
    compatibilityOk: boolean('compatibility_ok').notNull().default(true),
    requestedAt: timestamp('requested_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex('inventory_parts_requests_org_number_uidx').on(
      t.organizationId,
      t.requestNumber,
    ),
    index('inventory_parts_requests_org_status_idx').on(
      t.organizationId,
      t.status,
    ),
  ],
);
