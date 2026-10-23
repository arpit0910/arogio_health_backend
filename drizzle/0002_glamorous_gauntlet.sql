ALTER TABLE "users" ADD COLUMN "height_cm" real;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "weight_kg" real;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_height_cm_range" CHECK ("users"."height_cm" is null or "users"."height_cm" between 50 and 300);--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_weight_kg_range" CHECK ("users"."weight_kg" is null or "users"."weight_kg" between 2 and 500);