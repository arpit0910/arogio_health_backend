ALTER TABLE "blood_bank_directory_entries"
  ADD COLUMN IF NOT EXISTS "image_data" bytea,
  ADD COLUMN IF NOT EXISTS "image_revision" uuid;
