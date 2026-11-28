CREATE TABLE health_article_thumbnails (
  article_id uuid PRIMARY KEY REFERENCES health_articles(id) ON DELETE CASCADE,
  image_data bytea NOT NULL,
  revision uuid NOT NULL DEFAULT gen_random_uuid()
);
