ALTER TABLE "hospitals" ADD COLUMN "listed" boolean DEFAULT true NOT NULL;
--> statement-breakpoint
UPDATE "hospitals" AS h SET "listed" = false FROM "care_directory_entries" AS c WHERE c."id" = h."id" AND c."published" = false AND c."reviewed_at" IS NOT NULL;
