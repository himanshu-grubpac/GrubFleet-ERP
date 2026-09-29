ALTER TABLE "organisation_employees" ALTER COLUMN "designation" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "organisation_employees" ALTER COLUMN "department_id" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "organisation_employees" ALTER COLUMN "location_id" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "organisation_employees" ALTER COLUMN "date_of_joining" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "organisation_employees" ALTER COLUMN "company_email" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "organisation_employees" ALTER COLUMN "mobile" DROP NOT NULL;
