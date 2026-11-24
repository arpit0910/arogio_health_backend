# Meditation library

Published yoga and meditation practices and videos.

In the admin portal, open **Meditation** to add or edit an item. Set its section,
English and Hindi copy, steps or video URL, publication status, and display
order. Lower display-order values appear first. The app groups practices by
section and shows the published items in that order.

The public list and item endpoints only return published content. The mobile
app refreshes the catalog when users revisit a library or pull to refresh.
Migration 0026 imports the previously bundled practices without replacing
existing practices with matching titles.

Entry point: [meditation-library.module.ts](meditation-library.module.ts).

## Controllers

- [meditation-library.controller.ts](controllers/meditation-library.controller.ts)

## Requests

- [meditation-library.input.ts](requests/meditation-library.input.ts)

## Services

- [meditation-library.service.ts](services/meditation-library.service.ts)

## Database tables

- `meditation_library_items` ? [meditation-library-items.schema.ts](../../../src/database/schema/meditation-library-items.schema.ts)

[All modules](../README.md) ? [Table catalog](../../../database/TABLES.md)
