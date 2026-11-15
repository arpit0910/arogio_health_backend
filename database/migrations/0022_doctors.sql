CREATE TABLE "doctors" (
	"id" uuid PRIMARY KEY NOT NULL,
	"source_key" text NOT NULL,
	"name_en" text NOT NULL,
	"name_hi" text DEFAULT '' NOT NULL,
	"address_line1" text DEFAULT '' NOT NULL,
	"address_line2" text DEFAULT '' NOT NULL,
	"landmark" text DEFAULT '' NOT NULL,
	"address_hi" text DEFAULT '' NOT NULL,
	"city" text NOT NULL,
	"state" text NOT NULL,
	"pincode" text DEFAULT '' NOT NULL,
	"country_code_1" text DEFAULT '' NOT NULL,
	"phone_1" text,
	"country_code_2" text DEFAULT '' NOT NULL,
	"phone_2" text,
	"email" text,
	"website" text,
	"source_url" text,
	"latitude" double precision,
	"longitude" double precision,
	"registration_number" text DEFAULT '' NOT NULL,
	"medical_council" text DEFAULT '' NOT NULL,
	"qualifications" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"languages" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"experience_years" integer,
	"consultation_fee" double precision,
	"summary_en" text DEFAULT '' NOT NULL,
	"summary_hi" text DEFAULT '' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "doctors_source_key_unique" UNIQUE("source_key"),
	CONSTRAINT "doctors_name_location_required" CHECK (length(btrim("doctors"."name_en")) > 0 and length(btrim("doctors"."city")) > 0 and length(btrim("doctors"."state")) > 0),
	CONSTRAINT "doctors_coordinates_valid" CHECK (("doctors"."latitude" is null and "doctors"."longitude" is null) or ("doctors"."latitude" is not null and "doctors"."longitude" is not null and "doctors"."latitude" between -90 and 90 and "doctors"."longitude" between -180 and 180)),
	CONSTRAINT "doctors_experience_valid" CHECK ("doctors"."experience_years" is null or "doctors"."experience_years" between 0 and 100),
	CONSTRAINT "doctors_fee_valid" CHECK ("doctors"."consultation_fee" is null or "doctors"."consultation_fee" >= 0),
	CONSTRAINT "doctors_version_positive" CHECK ("doctors"."version" > 0)
);
--> statement-breakpoint
CREATE TABLE "doctor_departments" (
	"doctor_id" uuid NOT NULL,
	"department_id" uuid NOT NULL,
	CONSTRAINT "doctor_departments_doctor_id_department_id_pk" PRIMARY KEY("doctor_id","department_id")
);
--> statement-breakpoint
CREATE TABLE "doctor_hospital_affiliations" (
	"doctor_id" uuid NOT NULL,
	"hospital_id" uuid NOT NULL,
	"role" text DEFAULT '' NOT NULL,
	"consultation_mode" text DEFAULT 'in_person' NOT NULL,
	"availability" text DEFAULT '' NOT NULL,
	"days_of_week" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"start_time" text,
	"end_time" text,
	"consultation_fee" double precision,
	CONSTRAINT "doctor_hospital_affiliations_doctor_id_hospital_id_pk" PRIMARY KEY("doctor_id","hospital_id"),
	CONSTRAINT "doctor_affiliation_fee_valid" CHECK ("doctor_hospital_affiliations"."consultation_fee" is null or "doctor_hospital_affiliations"."consultation_fee" >= 0),
	CONSTRAINT "doctor_affiliation_time_valid" CHECK (("doctor_hospital_affiliations"."start_time" is null and "doctor_hospital_affiliations"."end_time" is null) or ("doctor_hospital_affiliations"."start_time" is not null and "doctor_hospital_affiliations"."end_time" is not null and "doctor_hospital_affiliations"."start_time" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' and "doctor_hospital_affiliations"."end_time" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' and "doctor_hospital_affiliations"."start_time" < "doctor_hospital_affiliations"."end_time"))
);
--> statement-breakpoint
ALTER TABLE "doctors" ADD CONSTRAINT "doctors_id_care_directory_entries_id_fk" FOREIGN KEY ("id") REFERENCES "public"."care_directory_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doctor_departments" ADD CONSTRAINT "doctor_departments_doctor_id_doctors_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."doctors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doctor_departments" ADD CONSTRAINT "doctor_departments_department_id_medical_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."medical_departments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doctor_hospital_affiliations" ADD CONSTRAINT "doctor_hospital_affiliations_doctor_id_doctors_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."doctors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doctor_hospital_affiliations" ADD CONSTRAINT "doctor_hospital_affiliations_hospital_id_hospitals_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospitals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "doctor_departments_department" ON "doctor_departments" USING btree ("department_id");--> statement-breakpoint
CREATE INDEX "doctor_affiliations_hospital" ON "doctor_hospital_affiliations" USING btree ("hospital_id");