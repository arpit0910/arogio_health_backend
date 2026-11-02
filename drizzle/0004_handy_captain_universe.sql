ALTER TABLE "users" ADD COLUMN "profile_setup" jsonb;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "profile_completed_at" timestamp with time zone;