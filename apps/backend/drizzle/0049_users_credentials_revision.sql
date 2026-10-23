ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "credentials_revision" integer NOT NULL DEFAULT 0;
