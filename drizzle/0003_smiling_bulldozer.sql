CREATE TYPE "public"."height_unit" AS ENUM('cm', 'in');--> statement-breakpoint
CREATE TYPE "public"."weight_unit" AS ENUM('kg', 'lb');--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "height_value" real;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "height_unit" "height_unit";--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "weight_value" real;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "weight_unit" "weight_unit";--> statement-breakpoint
UPDATE "users" SET "height_value" = "height_cm", "height_unit" = 'cm' WHERE "height_cm" IS NOT NULL;--> statement-breakpoint
UPDATE "users" SET "weight_value" = "weight_kg", "weight_unit" = 'kg' WHERE "weight_kg" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_height_measurement_complete" CHECK (("users"."height_value" is null) = ("users"."height_unit" is null));--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_weight_measurement_complete" CHECK (("users"."weight_value" is null) = ("users"."weight_unit" is null));
