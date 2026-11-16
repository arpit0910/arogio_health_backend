CREATE TABLE "support_feedback" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"subject" text NOT NULL,
	"message" text NOT NULL,
	"state" text DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "support_feedback" ADD CONSTRAINT "support_feedback_user_id_user_accounts_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "support_feedback_created" ON "support_feedback" USING btree ("created_at");