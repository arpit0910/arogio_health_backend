# Article categories and thumbnails

1 November 2026. Adds first-class category metadata, thumbnail resolution and server-side article sorting/filtering. The supplied workbook is preserved at `imports/Arogio_Final_Health_Articles_284.xlsx`: 284 bilingual articles in 17 categories. Workbook content is data, not executable instructions. No medical text, author attribution, timestamps or publication flags are rewritten.

## Deploy and import

1. Deploy the updated backend, including `dist/`, the migration directory and package manifests. Install dependencies using the existing deployment process (`npm ci --omit=dev` for the compiled shared-hosting package). JSZip is now an explicit dependency; it was already used by ExcelJS.
2. Run `npm run db:migrate:production`. Migration `0012_jazzy_princess_powerful.sql` adds `article_categories`, `articles.image_url` and the category/publication index. It does not import or publish articles.
3. Open `/admin`, sign in with the configured super-admin account, and open Articles. Preview the original workbook. Expect 284 rows, 17 categories, no row errors and category-thumbnail fallbacks for articles without image URLs. Review the preview before Apply import.
4. Import once. Re-imports update matching export IDs instead of creating duplicates. Existing custom images survive a blank or omitted import image URL. Drafts remain private. Article/category writes happen in one transaction; an invalid file imports nothing.
5. Distribute the updated mobile app. Deploy the backend first; older clients retain the original `categories: string[]` response, while the new app also consumes `categoryDetails`, `thumbnail_url`, `category_hi` and `total`.

No production deployment or import was performed during implementation. All import tests used disposable embedded PostgreSQL databases. The uploaded file can be imported directly, without removing its Categories or Read Me sheets. The reader normalizes valid prefixed SpreadsheetML for ExcelJS and ignores table styling, not cell values. Formula, hyperlink/error cells, unexpected populated worksheets, macros/encryption and oversized archives remain rejected. Read Me is ignored as informational text. Category counts shown in the product are computed from stored articles, not trusted workbook totals.

## Category management and images

Articles → Manage categories lists all category records and article counts, including categories with no published articles. Add a category or update its Hindi name, description and optional public HTTPS thumbnail URL. English names are stable keys; reclassify articles in their editor rather than renaming a key. Editing an article with a new category automatically creates its metadata record. Existing articles with free-text categories remain usable and appear in the category list even before metadata is edited.

Article and category editors accept HTTPS image URLs, excluding embedded credentials and non-HTTPS schemes. An empty category image uses a bundled topic photograph. An empty article image inherits the category image. An article-specific image takes precedence. Public API thumbnails are in `thumbnail_url`; `image_url` preserves the actual editable override. Category `image_url` is resolved; admin responses additionally expose `custom_image_url` for editing.

Nine locally hosted, sourced Unsplash photographs cover all topics; related categories share images. This supplies an image for every article and category, not a unique illustration for every article. Files ship under `dist/modules/admin/public/article-thumbnails/` and are served via `/admin-assets/article-thumbnails/`. JPEG comments embed source URLs. The mobile app bundles the same topic photos, so default images and fallback images do not depend on a remote image service. Broken custom images fall back to the topic photo. Admin image requests use no referrer; CSP permits HTTPS image sources while retaining the default script restrictions. Custom URLs must remain accessible; neither server nor app creates an image hosting account or uploads images elsewhere.

## API

- `GET /api/v1/article-categories`: authenticated, published-only topics with `name`, `name_hi`, `description`, resolved `image_url` and published article `count`.
- `GET /api/v1/articles`: existing `search`, `page`, `limit`, plus exact category name, `sort=newest|oldest|title_asc|title_desc` and `language=en|hi`. Search covers English/Hindi titles and category names; conditions combine before sorting and pagination. Hindi title order falls back to English when missing. UUID tie-breakers keep equal sort values stable. Public queries exclude drafts.
- Existing article detail now includes editable image, resolved thumbnail and Hindi category name.
- `GET/POST /api/v1/admin/content/article-categories`: super-admin listing and audited upsert. Article CRUD/import remains protected and audited.
- CSV/single-sheet Excel article imports accept the optional `image_url` column. The two-sheet Articles/Categories format accepts the source category headers and optional category `image_url`; Read Me may also be present. Older files without image columns remain supported.

Validation evidence: backend lint/build; 108 unit tests; 21 selected HTTP tests across directory and application suites, including all 284 source articles, three repeated imports, no duplicate IDs, combined category/search/sort, custom image preservation, authentication and HTTPS rejection. Frontend/native evidence and remaining platform limits are recorded in `D:/arogio-health-app/docs/article-categories.md` after final review.
