ALTER TABLE "users" ADD COLUMN "deletion_requested_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "recoverable_until" timestamp with time zone;