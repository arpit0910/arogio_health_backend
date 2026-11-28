CREATE TABLE "care_affiliations" (
	"doctor_id" uuid NOT NULL,
	"hospital_id" uuid NOT NULL,
	CONSTRAINT "care_affiliations_doctor_id_hospital_id_pk" PRIMARY KEY("doctor_id","hospital_id")
);
--> statement-breakpoint
CREATE TABLE "care_corrections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entry_id" uuid NOT NULL,
	"message" text NOT NULL,
	"state" text DEFAULT 'open' NOT NULL,
	"resolution" text,
	"resolved_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "care_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_key" text NOT NULL,
	"kind" text NOT NULL,
	"name" text NOT NULL,
	"name_hi" text DEFAULT '' NOT NULL,
	"city" text DEFAULT 'Jaipur' NOT NULL,
	"address" text DEFAULT '' NOT NULL,
	"address_hi" text DEFAULT '' NOT NULL,
	"phone" text,
	"source_url" text NOT NULL,
	"details" jsonb NOT NULL,
	"published" boolean DEFAULT false NOT NULL,
	"reviewed_at" timestamp with time zone,
	"reviewed_by" uuid,
	"review_evidence" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "care_entries_source_key_unique" UNIQUE("source_key")
);
--> statement-breakpoint
ALTER TABLE "care_affiliations" ADD CONSTRAINT "care_affiliations_doctor_id_care_entries_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."care_entries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "care_affiliations" ADD CONSTRAINT "care_affiliations_hospital_id_care_entries_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."care_entries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "care_corrections" ADD CONSTRAINT "care_corrections_entry_id_care_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."care_entries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "care_corrections" ADD CONSTRAINT "care_corrections_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "care_entries" ADD CONSTRAINT "care_entries_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "care_hospital_doctors" ON "care_affiliations" USING btree ("hospital_id");--> statement-breakpoint
CREATE INDEX "care_public_kind_city" ON "care_entries" USING btree ("published","kind","city");