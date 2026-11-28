# Health resources

Health articles, article categories, blood-bank discovery and their shared CSV/workbook import workflow.

Entry point: [health-resources.module.ts](health-resources.module.ts).

## Controllers

- [health-resources.controller.ts](controllers/health-resources.controller.ts)
- [public-directory.controller.ts](controllers/public-directory.controller.ts)

## Requests

- [health-resources.input.ts](requests/health-resources.input.ts)

## Services

- [health-resources.service.ts](services/health-resources.service.ts)

## Imports

- [csv.spec.ts](imports/csv.spec.ts)
- [csv.ts](imports/csv.ts)
- [import.ts](imports/import.ts)
- [workbook.spec.ts](imports/workbook.spec.ts)
- [workbook.ts](imports/workbook.ts)

## Content

- [article-topics.ts](content/article-topics.ts)
- [thumbnails.ts](content/thumbnails.ts)

## Database tables

- `health_articles` ? [health-articles.schema.ts](../../../src/database/schema/health-articles.schema.ts)
- `health_article_categories` ? [health-article-categories.schema.ts](../../../src/database/schema/health-article-categories.schema.ts)
- `blood_bank_directory_entries` ? [blood-bank-directory-entries.schema.ts](../../../src/database/schema/blood-bank-directory-entries.schema.ts)

[All modules](../README.md) ? [Table catalog](../../../database/TABLES.md)
