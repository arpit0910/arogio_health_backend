CREATE TABLE "medical_departments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_key" text NOT NULL,
	"name_en" text NOT NULL,
	"name_hi" text DEFAULT '' NOT NULL,
	"description_en" text DEFAULT '' NOT NULL,
	"description_hi" text DEFAULT '' NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "medical_departments_source_key_unique" UNIQUE("source_key"),
	CONSTRAINT "medical_departments_name_required" CHECK (length(btrim("medical_departments"."name_en")) > 0),
	CONSTRAINT "medical_departments_version_positive" CHECK ("medical_departments"."version" > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX "medical_departments_name_en_unique" ON "medical_departments" USING btree (lower(btrim("name_en")));