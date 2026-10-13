DO $$ BEGIN
  CREATE TYPE "finance_purchase_tax_mode" AS ENUM('INCLUSIVE', 'EXCLUSIVE');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "finance_invoice_lines" ADD COLUMN IF NOT EXISTS "asset_class_id" uuid;
ALTER TABLE "finance_invoice_lines" ADD COLUMN IF NOT EXISTS "tax_mode" "finance_purchase_tax_mode";
ALTER TABLE "finance_invoice_lines" ADD COLUMN IF NOT EXISTS "vat_percent" integer;
ALTER TABLE "finance_invoice_lines" ADD COLUMN IF NOT EXISTS "base_amount_minor" bigint;
ALTER TABLE "finance_invoice_lines" ADD COLUMN IF NOT EXISTS "tax_amount_minor" bigint;

DO $$ BEGIN
  ALTER TABLE "finance_invoice_lines"
    ADD CONSTRAINT "finance_invoice_lines_asset_class_id_fk"
    FOREIGN KEY ("asset_class_id") REFERENCES "asset_register_asset_classes"("id")
    ON DELETE RESTRICT ON UPDATE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "finance_invoice_lines_asset_class_id_idx"
  ON "finance_invoice_lines" ("asset_class_id");
