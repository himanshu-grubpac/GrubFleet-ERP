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
import { leaseContracts } from './fleet-leasing.schema';
import {
  organisationClients,
  organisationSuppliers,
} from './organisation.schema';

export const financeInvoiceTypeEnum = pgEnum('finance_invoice_type', [
  'purchase',
  'sale',
  'billing',
]);

export const financeInvoiceStatusEnum = pgEnum('finance_invoice_status', [
  'unpaid',
  'partially_paid',
  'paid',
  'cancelled',
]);

export const financePurchaseLineKindEnum = pgEnum(
  'finance_purchase_line_kind',
  ['vehicle', 'spare_parts', 'sale_vehicle', 'billing_lease'],
);

/** Spare part master (Stock Register); shared FK from Finance invoice lines. */
export const inventoryCatalogParts = pgTable(
  'inventory_catalog_parts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id').notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    partCode: varchar('part_code', { length: 64 }),
    brand: varchar('brand', { length: 255 }),
    unitOfMeasure: varchar('unit_of_measure', { length: 32 })
      .notNull()
      .default('Each'),
    reorderThreshold: integer('reorder_threshold').notNull().default(0),
    retailMarkupPercent: integer('retail_markup_percent').notNull().default(0),
    wholesaleMarkupPercent: integer('wholesale_markup_percent')
      .notNull()
      .default(0),
    compatibleAssetClasses: jsonb('compatible_asset_classes')
      .$type<string[]>()
      .notNull()
      .default([]),
    deactivateReason: text('deactivate_reason'),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('inventory_catalog_parts_org_active_idx').on(
      t.organizationId,
      t.isActive,
    ),
    uniqueIndex('inventory_catalog_parts_org_name_uidx').on(
      t.organizationId,
      t.name,
    ),
  ],
);

export const financeInvoiceNumberSequences = pgTable(
  'finance_invoice_number_sequences',
  {
    organizationId: uuid('organization_id').notNull(),
    year: integer('year').notNull(),
    lastSeq: integer('last_seq').notNull().default(0),
  },
  (t) => [
    uniqueIndex('finance_invoice_number_sequences_org_year_uidx').on(
      t.organizationId,
      t.year,
    ),
  ],
);

export const financeVendorPaymentNumberSequences = pgTable(
  'finance_vendor_payment_number_sequences',
  {
    organizationId: uuid('organization_id').notNull(),
    year: integer('year').notNull(),
    lastSeq: integer('last_seq').notNull().default(0),
  },
  (t) => [
    uniqueIndex('finance_vendor_payment_number_sequences_org_year_uidx').on(
      t.organizationId,
      t.year,
    ),
  ],
);

export const financeInvoices = pgTable(
  'finance_invoices',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id').notNull(),
    invoiceNumber: varchar('invoice_number', { length: 32 }).notNull(),
    invoiceType: financeInvoiceTypeEnum('invoice_type').notNull(),
    status: financeInvoiceStatusEnum('status').notNull().default('unpaid'),
    supplierId: uuid('supplier_id').references(() => organisationSuppliers.id, {
      onDelete: 'restrict',
    }),
    partyName: varchar('party_name', { length: 255 }).notNull(),
    description: varchar('description', { length: 500 }).notNull(),
    totalAmountMinor: bigint('total_amount_minor', {
      mode: 'number',
    }).notNull(),
    amountPaidMinor: bigint('amount_paid_minor', { mode: 'number' })
      .notNull()
      .default(0),
    invoiceDate: date('invoice_date').notNull(),
    notes: text('notes'),
    partyEmail: varchar('party_email', { length: 320 }),
    clientId: uuid('client_id').references(() => organisationClients.id, {
      onDelete: 'restrict',
    }),
    leaseContractId: uuid('lease_contract_id').references(
      () => leaseContracts.id,
      { onDelete: 'restrict' },
    ),
    billingPeriod: varchar('billing_period', { length: 120 }),
    cancelReason: text('cancel_reason'),
    saleAutoEmailRequested: boolean('sale_auto_email_requested')
      .notNull()
      .default(false),
    purchaseLineKind: financePurchaseLineKindEnum('purchase_line_kind'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex('finance_invoices_org_number_uidx').on(
      t.organizationId,
      t.invoiceNumber,
    ),
    index('finance_invoices_org_type_idx').on(t.organizationId, t.invoiceType),
    index('finance_invoices_org_status_idx').on(t.organizationId, t.status),
    index('finance_invoices_org_date_idx').on(t.organizationId, t.invoiceDate),
    index('finance_invoices_supplier_id_idx').on(t.supplierId),
    index('finance_invoices_client_id_idx').on(t.clientId),
    index('finance_invoices_lease_contract_id_idx').on(t.leaseContractId),
  ],
);

export const financeInvoiceLines = pgTable(
  'finance_invoice_lines',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    invoiceId: uuid('invoice_id')
      .notNull()
      .references(() => financeInvoices.id, { onDelete: 'cascade' }),
    lineKind: financePurchaseLineKindEnum('line_kind').notNull(),
    assetClassName: varchar('asset_class_name', { length: 120 }),
    inventoryPartId: uuid('inventory_part_id').references(
      () => inventoryCatalogParts.id,
      { onDelete: 'restrict' },
    ),
    quantity: integer('quantity').notNull().default(1),
    unitCostMinor: bigint('unit_cost_minor', { mode: 'number' }),
    lineAmountMinor: bigint('line_amount_minor', { mode: 'number' }).notNull(),
    batchLot: varchar('batch_lot', { length: 120 }),
    vehicleId: uuid('vehicle_id').references(() => assetRegisterVehicles.id, {
      onDelete: 'restrict',
    }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('finance_invoice_lines_invoice_id_idx').on(t.invoiceId),
    index('finance_invoice_lines_vehicle_id_idx').on(t.vehicleId),
  ],
);

export const financeInvoicePayments = pgTable(
  'finance_invoice_payments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    invoiceId: uuid('invoice_id')
      .notNull()
      .references(() => financeInvoices.id, { onDelete: 'cascade' }),
    organizationId: uuid('organization_id').notNull(),
    amountMinor: bigint('amount_minor', { mode: 'number' }).notNull(),
    paymentDate: date('payment_date').notNull(),
    paymentMethod: varchar('payment_method', { length: 64 }),
    paymentReference: varchar('payment_reference', { length: 120 }),
    paymentNumber: varchar('payment_number', { length: 32 }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('finance_invoice_payments_invoice_id_idx').on(t.invoiceId),
    index('finance_invoice_payments_org_idx').on(t.organizationId),
    uniqueIndex('finance_invoice_payments_org_payment_number_uidx').on(
      t.organizationId,
      t.paymentNumber,
    ),
    index('finance_invoice_payments_payment_number_idx').on(t.paymentNumber),
  ],
);

export const financeInvoicesRelations = relations(
  financeInvoices,
  ({ one, many }) => ({
    supplier: one(organisationSuppliers, {
      fields: [financeInvoices.supplierId],
      references: [organisationSuppliers.id],
    }),
    lines: many(financeInvoiceLines),
    payments: many(financeInvoicePayments),
    client: one(organisationClients, {
      fields: [financeInvoices.clientId],
      references: [organisationClients.id],
    }),
    leaseContract: one(leaseContracts, {
      fields: [financeInvoices.leaseContractId],
      references: [leaseContracts.id],
    }),
  }),
);

export const financeInvoicePaymentsRelations = relations(
  financeInvoicePayments,
  ({ one }) => ({
    invoice: one(financeInvoices, {
      fields: [financeInvoicePayments.invoiceId],
      references: [financeInvoices.id],
    }),
  }),
);

export const financeInvoiceLinesRelations = relations(
  financeInvoiceLines,
  ({ one }) => ({
    invoice: one(financeInvoices, {
      fields: [financeInvoiceLines.invoiceId],
      references: [financeInvoices.id],
    }),
    part: one(inventoryCatalogParts, {
      fields: [financeInvoiceLines.inventoryPartId],
      references: [inventoryCatalogParts.id],
    }),
  }),
);
