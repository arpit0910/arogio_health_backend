CREATE TABLE "articles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" text NOT NULL,
	"title_en" text NOT NULL,
	"title_hi" text DEFAULT '' NOT NULL,
	"excerpt_en" text DEFAULT '' NOT NULL,
	"excerpt_hi" text DEFAULT '' NOT NULL,
	"content_en" text NOT NULL,
	"content_hi" text DEFAULT '' NOT NULL,
	"category" text NOT NULL,
	"author_name" text DEFAULT '' NOT NULL,
	"is_published" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "articles_source_id_unique" UNIQUE("source_id")
);
--> statement-breakpoint
CREATE TABLE "blood_banks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" text NOT NULL,
	"name_en" text NOT NULL,
	"name_hi" text DEFAULT '' NOT NULL,
	"city" text NOT NULL,
	"state" text NOT NULL,
	"pincode" text,
	"landmark" text,
	"address_en" text NOT NULL,
	"address_hi" text DEFAULT '' NOT NULL,
	"country_code" text DEFAULT '+91' NOT NULL,
	"phone" text,
	"emergency_country_code" text DEFAULT '+91' NOT NULL,
	"emergency_phone" text,
	"email" text,
	"website" text,
	"is_verified" boolean DEFAULT false NOT NULL,
	"is_24_7" boolean DEFAULT false NOT NULL,
	"is_government" boolean DEFAULT false NOT NULL,
	"component_facility" boolean DEFAULT false NOT NULL,
	"apheresis_facility" boolean DEFAULT false NOT NULL,
	"available_blood_groups" text[] DEFAULT '{}' NOT NULL,
	"latitude" double precision,
	"longitude" double precision,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "blood_banks_source_id_unique" UNIQUE("source_id"),
	CONSTRAINT "blood_bank_coordinates" CHECK (("blood_banks"."latitude" is null and "blood_banks"."longitude" is null) or ("blood_banks"."latitude" is not null and "blood_banks"."longitude" is not null and "blood_banks"."latitude" between -90 and 90 and "blood_banks"."longitude" between -180 and 180))
);
--> statement-breakpoint
CREATE INDEX "articles_published_created" ON "articles" USING btree ("is_published","created_at");--> statement-breakpoint
CREATE INDEX "blood_banks_city" ON "blood_banks" USING btree ("city");--> statement-breakpoint
CREATE INDEX "blood_banks_active_geo" ON "blood_banks" USING btree ("is_active","latitude","longitude");
