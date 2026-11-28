ALTER TABLE "medical_departments"
  ADD COLUMN IF NOT EXISTS "image_data" bytea,
  ADD COLUMN IF NOT EXISTS "image_revision" uuid;
