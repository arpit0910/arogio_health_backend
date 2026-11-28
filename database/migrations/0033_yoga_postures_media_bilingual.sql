ALTER TABLE "meditation_library_items"
  ADD COLUMN IF NOT EXISTS "impact_en" text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "impact_hi" text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "sanskrit_name" text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "difficulty" text NOT NULL DEFAULT 'gentle',
  ADD COLUMN IF NOT EXISTS "image_url" text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "audio_url" text NOT NULL DEFAULT '';
