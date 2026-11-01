CREATE TABLE "article_categories" (
	"name" text PRIMARY KEY NOT NULL,
	"name_hi" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"image_url" text DEFAULT '' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN "image_url" text DEFAULT '' NOT NULL;--> statement-breakpoint
CREATE INDEX "articles_category_published" ON "articles" USING btree ("category","is_published");