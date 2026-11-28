ALTER TABLE meditation_library_items ADD COLUMN published_version integer NOT NULL DEFAULT 0;
--> statement-breakpoint
CREATE TABLE wellness_publication_versions (
  item_id uuid NOT NULL,
  version integer NOT NULL CHECK (version > 0),
  manifest jsonb NOT NULL,
  published_by uuid,
  published_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (item_id, version)
);
--> statement-breakpoint
WITH baseline AS (
  UPDATE meditation_library_items SET published_version = 1 WHERE published RETURNING *
)
INSERT INTO wellness_publication_versions (item_id, version, manifest, published_at)
SELECT id, 1,
  (to_jsonb(baseline) - ARRAY['created_by','video_id','duration_seconds','sort_order','published_version','created_at','updated_at'])
  || jsonb_build_object('videoId', video_id, 'durationSeconds', duration_seconds, 'sortOrder', sort_order,
    'publishedVersion', published_version, 'createdAt', created_at, 'updatedAt', updated_at),
  updated_at
FROM baseline;
