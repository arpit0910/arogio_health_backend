ALTER TABLE "care_directory_entries" ADD COLUMN "image_url" text;--> statement-breakpoint
ALTER TABLE "care_directory_entries" ADD COLUMN "image_alt" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "hospitals" ADD COLUMN "image_data" "bytea";--> statement-breakpoint
ALTER TABLE "hospitals" ADD COLUMN "image_alt" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "hospitals" ADD COLUMN "image_revision" uuid;--> statement-breakpoint
ALTER TABLE "doctors" ADD COLUMN "image_data" "bytea";--> statement-breakpoint
ALTER TABLE "doctors" ADD COLUMN "image_alt" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "doctors" ADD COLUMN "image_revision" uuid;