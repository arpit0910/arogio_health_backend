# Articles and blood-bank directory

The admin portal has Articles and Blood banks sections. Each supports search, pagination, create, edit and delete. Articles have a publication switch; banks have a visibility switch. Changes and imports use the existing super-admin guard and audit trail.

## Upload the supplied exports

1. Open the appropriate section in `/admin` and choose the original UTF-8 CSV under **Import CSV**.
2. Choose **Preview import**. Review row errors, new/update counts, publication status and missing coordinates.
3. Choose **Import records**. A file with any invalid row writes nothing. The import is a database transaction.

Keep the supplied header names. Maximum size is 8 MB and 5,000 records. Export IDs are retained as separate source IDs: importing the same IDs updates records without duplicating their app IDs. Omitted records are not deleted. Bank visibility changes made in admin survive repeat CSV imports. Article publication follows the CSV's `is_published` column.

Boolean fields accept `1`/`0` or `true`/`false`. Blood groups use semicolons. Empty or `Not Available` contact/coordinate fields become null. Bare website hostnames gain `https://`; non-HTTP website schemes are rejected. Literal escaped newlines in article bodies become paragraphs. SQL dates without a timezone are interpreted as UTC; the portal displays dates in India time. Content is rendered as plain text, never HTML or executable instructions.

The supplied exports validate as 234 articles and 37 banks. Seventeen banks have no coordinates. Admin can add their correct latitude and longitude later; both must be supplied together. No coordinates or distances are invented. All banks in the supplied file are in Jaipur.

## App behavior

- Home shows three published articles with links to the article directory and bilingual reading screen.
- The sidebar includes Articles and Blood banks.
- Home's bottom-right Emergency shortcut opens the bank directory and requests foreground location. There is also an explicit Find near me button.
- Nearby results use straight-line Haversine distance, default radius 50 km, with an optional 200 km expansion. City/name/pincode search works without location, including unlocated banks.
- Filters cover listed blood groups and listed 24-hour service. These are directory claims, not live stock. Users are prompted to call and confirm.
- Phone links and external map directions use listed contact/address data. Location is held only in screen memory, sent in a POST body, and never saved in the database. No background tracking, location API key or geocoding service is required.

## API

All routes use the `/api/v1` prefix and require the existing bearer session.

| Route | Behavior |
| --- | --- |
| `GET /articles` | Published summaries; `search`, `category`, `page`, `limit` |
| `GET /articles/:id` | Published bilingual article body |
| `GET /blood-banks` | Visible listings; `search`, `bloodGroup`, `only24h`, `page`, `limit` |
| `POST /blood-banks/nearby` | JSON latitude/longitude, optional radiusKm, bloodGroup, only24h, page, limit; sorted distanceKm |
| `GET /admin/content/:kind` | Admin list including drafts/hidden banks |
| `GET /admin/content/:kind/:id` | Full editable record |
| `POST /admin/content/:kind` | Create |
| `PATCH /admin/content/:kind/:id` | Save complete editable fields, excluding generated IDs/timestamps |
| `DELETE /admin/content/:kind/:id` | Delete |
| `POST /admin/content/:kind/import/preview` | Multipart `file`, validates without writing |
| `POST /admin/content/:kind/import/apply` | Multipart `file`, validates again and applies atomically |

`:kind` is `articles` or `blood-banks`. Admin routes require super-admin access. Nearby responses use private/no-store caching and omit unlocated banks; `missingCoordinates` reports their number. Coordinates are redacted from request-body logs.

## Deployment and verification

Deploy the backend containing migration `0011_articles_blood_banks.sql`, run the normal production migration command (`npm run db:migrate:production`), then upload the CSVs through admin. Build/deploy the mobile client against that backend. Development verification did not migrate, import into, or deploy the production server.

Verification includes CSV parser tests, authenticated HTTP journeys with an isolated PostgreSQL-compatible database, role enforcement, draft visibility, repeat imports, atomic rejection, coordinate validation, radius/group filtering and distance ordering. Both original exports were also imported twice into a separate disposable database: 234/37 records remained, with 20 correctly sorted Jaipur nearby results and 17 unlocated banks. Admin and mobile layouts were inspected with real CSV fixtures. Native GPS permission and phone/maps handoff still need a physical-device check.
