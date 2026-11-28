-- Preserve stable import matching and remove stored source URLs.
ALTER TABLE "care_directory_entries" RENAME COLUMN "source_key" TO "record_key";
--> statement-breakpoint
ALTER TABLE "care_directory_entries" RENAME CONSTRAINT "care_directory_entries_source_key_unique" TO "care_directory_entries_record_key_unique";
--> statement-breakpoint
ALTER TABLE "care_directory_entries" DROP COLUMN "source_url";
--> statement-breakpoint
ALTER TABLE "doctors" RENAME COLUMN "source_key" TO "record_key";
--> statement-breakpoint
ALTER TABLE "doctors" RENAME CONSTRAINT "doctors_source_key_unique" TO "doctors_record_key_unique";
--> statement-breakpoint
ALTER TABLE "doctors" DROP COLUMN "source_url";
--> statement-breakpoint
ALTER TABLE "hospitals" RENAME COLUMN "source_key" TO "record_key";
--> statement-breakpoint
ALTER TABLE "hospitals" RENAME CONSTRAINT "hospitals_source_key_unique" TO "hospitals_record_key_unique";
--> statement-breakpoint
ALTER TABLE "hospitals" DROP COLUMN "source_url";
--> statement-breakpoint
ALTER TABLE "medical_departments" RENAME COLUMN "source_key" TO "record_key";
--> statement-breakpoint
ALTER TABLE "medical_departments" RENAME CONSTRAINT "medical_departments_source_key_unique" TO "medical_departments_record_key_unique";
--> statement-breakpoint
ALTER TABLE "medical_diseases" RENAME COLUMN "source_key" TO "record_key";
--> statement-breakpoint
ALTER TABLE "medical_diseases" RENAME CONSTRAINT "medical_diseases_source_key_unique" TO "medical_diseases_record_key_unique";
--> statement-breakpoint
ALTER TABLE "health_articles" RENAME COLUMN "source_id" TO "record_key";
--> statement-breakpoint
ALTER TABLE "health_articles" RENAME CONSTRAINT "health_articles_source_id_unique" TO "health_articles_record_key_unique";
--> statement-breakpoint
ALTER TABLE "blood_bank_directory_entries" RENAME COLUMN "source_id" TO "record_key";
--> statement-breakpoint
ALTER TABLE "blood_bank_directory_entries" RENAME CONSTRAINT "blood_bank_directory_entries_source_id_unique" TO "blood_bank_directory_entries_record_key_unique";
--> statement-breakpoint
ALTER TABLE "blood_bank_directory_entries" DROP COLUMN "source_url";
--> statement-breakpoint
UPDATE "administration_audit_logs"
SET "metadata" = "metadata" - 'sourceUrl' - 'source_url'
WHERE "metadata" ?| ARRAY['sourceUrl', 'source_url'];
