ALTER TYPE "finance_purchase_line_kind" ADD VALUE IF NOT EXISTS 'billing_recovery';

ALTER TABLE "fleet_return_inspections"
  ADD COLUMN IF NOT EXISTS "finance_recovery_invoice_id" uuid;

ALTER TABLE "finance_invoices"
  ADD COLUMN IF NOT EXISTS "fleet_return_inspection_id" uuid;

DO $$ BEGIN
  ALTER TABLE "fleet_return_inspections"
    ADD CONSTRAINT "fleet_return_inspections_finance_recovery_invoice_id_fkey"
    FOREIGN KEY ("finance_recovery_invoice_id")
    REFERENCES "finance_invoices"("id")
    ON DELETE SET NULL
    ON UPDATE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "finance_invoices"
    ADD CONSTRAINT "finance_invoices_fleet_return_inspection_id_fkey"
    FOREIGN KEY ("fleet_return_inspection_id")
    REFERENCES "fleet_return_inspections"("id")
    ON DELETE SET NULL
    ON UPDATE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "finance_invoices_fleet_return_inspection_id_uidx"
  ON "finance_invoices" ("fleet_return_inspection_id")
  WHERE "fleet_return_inspection_id" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "fleet_return_inspections_finance_recovery_invoice_id_idx"
  ON "fleet_return_inspections" ("finance_recovery_invoice_id");
