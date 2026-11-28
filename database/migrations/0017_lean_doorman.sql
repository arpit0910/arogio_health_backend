CREATE TABLE "medicine_doses" (
	"user_id" uuid NOT NULL,
	"medicine_id" uuid NOT NULL,
	"day" date NOT NULL,
	"time" text NOT NULL,
	"status" text NOT NULL,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"snoozed_until" timestamp with time zone,
	CONSTRAINT "medicine_doses_user_id_medicine_id_day_time_pk" PRIMARY KEY("user_id","medicine_id","day","time"),
	CONSTRAINT "medicine_dose_status" CHECK ("medicine_doses"."status" in ('taken', 'skipped', 'pending')),
	CONSTRAINT "medicine_dose_clock" CHECK ("medicine_doses"."time" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$')
);
--> statement-breakpoint
ALTER TABLE "medicine_doses" ADD CONSTRAINT "medicine_doses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "medicine_doses_user_day" ON "medicine_doses" USING btree ("user_id","day");