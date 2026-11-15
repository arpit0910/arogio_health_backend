CREATE TABLE "medical_diseases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_key" text NOT NULL,
	"name_en" text NOT NULL,
	"name_hi" text DEFAULT '' NOT NULL,
	"description_en" text DEFAULT '' NOT NULL,
	"description_hi" text DEFAULT '' NOT NULL,
	"department_id" uuid NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "medical_diseases_source_key_unique" UNIQUE("source_key"),
	CONSTRAINT "medical_diseases_name_required" CHECK (length(btrim("medical_diseases"."name_en")) > 0),
	CONSTRAINT "medical_diseases_version_positive" CHECK ("medical_diseases"."version" > 0)
);
--> statement-breakpoint
ALTER TABLE "medical_diseases" ADD CONSTRAINT "medical_diseases_department_id_medical_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."medical_departments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "medical_diseases_name_en_unique" ON "medical_diseases" USING btree (lower(btrim("name_en")));--> statement-breakpoint
CREATE INDEX "medical_diseases_department_active" ON "medical_diseases" USING btree ("department_id","is_active");