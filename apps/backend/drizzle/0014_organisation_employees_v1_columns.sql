-- Align organisation_employees with Drizzle schema (employee_code, mobile/email renames, off-board fields).
-- Idempotent for fresh CI DBs (after 0009) and legacy installs that partially migrated.

DO $$ BEGIN
  CREATE TYPE "public"."organisation_off_board_reason_type" AS ENUM(
    'resignation',
    'termination',
    'end_of_contract',
    'other'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "organisation_employees" ADD COLUMN IF NOT EXISTS "employee_code" varchar(64);
--> statement-breakpoint
ALTER TABLE "organisation_employees" ADD COLUMN IF NOT EXISTS "department_id" uuid;
--> statement-breakpoint
ALTER TABLE "organisation_employees" ADD COLUMN IF NOT EXISTS "reports_to_designation_override" varchar(255);
--> statement-breakpoint
ALTER TABLE "organisation_employees" ADD COLUMN IF NOT EXISTS "reports_to_location_override" varchar(255);
--> statement-breakpoint
ALTER TABLE "organisation_employees" ADD COLUMN IF NOT EXISTS "linked_user_id" uuid;
--> statement-breakpoint
ALTER TABLE "organisation_employees" ADD COLUMN IF NOT EXISTS "off_boarded_at" timestamp with time zone;
--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'organisation_employees' AND column_name = 'phone'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'organisation_employees' AND column_name = 'mobile'
  ) THEN
    ALTER TABLE "organisation_employees" RENAME COLUMN "phone" TO "mobile";
  END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "organisation_employees" ADD COLUMN IF NOT EXISTS "mobile" varchar(32);
--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'organisation_employees' AND column_name = 'email'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'organisation_employees' AND column_name = 'company_email'
  ) THEN
    ALTER TABLE "organisation_employees" RENAME COLUMN "email" TO "company_email";
  END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "organisation_employees" ADD COLUMN IF NOT EXISTS "company_email" varchar(320);
--> statement-breakpoint
ALTER TABLE "organisation_employees" ADD COLUMN IF NOT EXISTS "off_board_reason_type" "organisation_off_board_reason_type";
--> statement-breakpoint
ALTER TABLE "organisation_employees" ADD COLUMN IF NOT EXISTS "off_board_comment" text;
--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'organisation_employees' AND column_name = 'deactivate_reason_type'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'organisation_employees' AND column_name = 'off_board_reason_type'
  ) THEN
    UPDATE "organisation_employees"
    SET "off_board_reason_type" = "deactivate_reason_type"::"organisation_off_board_reason_type"
    WHERE "off_board_reason_type" IS NULL
      AND "deactivate_reason_type" IS NOT NULL
      AND "deactivate_reason_type" IN (
        'resignation',
        'termination',
        'end_of_contract',
        'other'
      );
  END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'organisation_employees' AND column_name = 'deactivate_comment'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'organisation_employees' AND column_name = 'off_board_comment'
  ) THEN
    UPDATE "organisation_employees"
    SET "off_board_comment" = "deactivate_comment"
    WHERE "off_board_comment" IS NULL AND "deactivate_comment" IS NOT NULL;
  END IF;
END $$;
