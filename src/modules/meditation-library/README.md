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

## Seed the starter catalog

Run `npm run seed:wellness` to validate the starter catalog without connecting
to a database. To load it after applying the existing database migrations, run
`npm run seed:wellness -- --apply` with `DATABASE_URL` pointing to the intended
database. The command reads `.env.local` if present. The seed inserts drafts and
skips existing IDs and matching titles within each section, preserving admin
edits and publication history when rerun.

For the embedded development database, stop the local API and run
`npm run seed:wellness -- --local` to load `.local/database`.

Open **Meditation** in the admin portal and choose **Yoga** or **Meditation**
in the section filter. Review the instructions and publish the entries you
want to show on mobile. More demanding postures are labelled as previews
for review with an instructor.

Yoga names and variations were cross-checked with the
[RIMYI certification syllabus](https://iyengar.ch/wp-content/uploads/2026/09/RIMYI_Certification-Course-Guidlines-Booklet-June-2020-1.pdf),
[Yoga Journal pose directory](https://www.yogajournal.com/pose-finder/pose-finder?scope=anon)
and [Tummee pose directory](https://www.tummee.com/yoga-poses/dru-yoga-poses).
The instructions and meditation prompts are original English text.

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
