ALTER TABLE "medical_departments"
  ADD COLUMN IF NOT EXISTS "icon" text NOT NULL DEFAULT 'stethoscope',
  ADD COLUMN IF NOT EXISTS "image_url" text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "sort_order" integer NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE "medical_diseases"
  ADD COLUMN IF NOT EXISTS "symptoms_en" text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "symptoms_hi" text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "precautions_en" text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "precautions_hi" text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "icon" text NOT NULL DEFAULT 'heart-pulse';
--> statement-breakpoint
ALTER TABLE "blood_bank_directory_entries"
  ADD COLUMN IF NOT EXISTS "image_url" text NOT NULL DEFAULT '';
