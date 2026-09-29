-- Align NOT NULL constraints on organisation_employees for v1 (department text, phone/email columns).
-- Idempotent: safe on fresh DB after 0009 (already nullable) and on legacy DBs with old column names.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'organisation_employees' AND column_name = 'designation'
  ) THEN
    ALTER TABLE "organisation_employees" ALTER COLUMN "designation" DROP NOT NULL;
  END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'organisation_employees' AND column_name = 'department_id'
  ) THEN
    ALTER TABLE "organisation_employees" ALTER COLUMN "department_id" DROP NOT NULL;
  END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'organisation_employees' AND column_name = 'location_id'
  ) THEN
    ALTER TABLE "organisation_employees" ALTER COLUMN "location_id" DROP NOT NULL;
  END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'organisation_employees' AND column_name = 'date_of_joining'
  ) THEN
    ALTER TABLE "organisation_employees" ALTER COLUMN "date_of_joining" DROP NOT NULL;
  END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'organisation_employees' AND column_name = 'company_email'
  ) THEN
    ALTER TABLE "organisation_employees" ALTER COLUMN "company_email" DROP NOT NULL;
  END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'organisation_employees' AND column_name = 'mobile'
  ) THEN
    ALTER TABLE "organisation_employees" ALTER COLUMN "mobile" DROP NOT NULL;
  END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'organisation_employees' AND column_name = 'email'
  ) THEN
    ALTER TABLE "organisation_employees" ALTER COLUMN "email" DROP NOT NULL;
  END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'organisation_employees' AND column_name = 'phone'
  ) THEN
    ALTER TABLE "organisation_employees" ALTER COLUMN "phone" DROP NOT NULL;
  END IF;
END $$;
