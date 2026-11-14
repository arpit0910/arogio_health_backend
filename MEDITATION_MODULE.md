# Admin-managed meditation library

The admin portal now has a **Meditation** page. It manages YouTube videos and timed written practices, including affirmations, meditation, breathing and grounding content.

## Admin workflow

1. Open `/admin`, sign in with a super-admin account, and select **Meditation**.
2. Choose **Add video** or **Add guided practice**.
3. Enter an English title and optional Hindi title, descriptions and creator credit. Select a section and display order (lower numbers first).
4. For videos, paste an HTTPS YouTube link; a video ID is extracted and stored. Short, watch, shorts, embed and live-video links are supported. Optional video duration is entered in seconds. The app derives the YouTube thumbnail and opens the video on request.
5. For practices, add preparation text and timed steps. Each step has an English title/instruction, optional Hindi translations and a duration. Steps can be added, removed and moved up. Set the repeat count for the sequence; total duration is calculated on the server.
6. Save as a draft or check **Published in the app**. List actions allow editing, publishing/unpublishing and deletion. Search and content-type filtering are available.

New records default to drafts. Only super-admin accounts may manage content. Writes are audited with actor/action/target/outcome; content bodies are not copied into the audit log. Updates require the `expectedUpdatedAt` returned when loading the record; stale edits return 409 instead of overwriting another administrator's work. Delete prompts for confirmation in the portal.

Limits: titles 160 characters, descriptions 1,000, preparation/instructions 2,000; up to 40 steps, 1–900 seconds per step, 1–60 repeats and a maximum 60-minute practice. Video durations are optional and at most four hours. Arbitrary external links, JavaScript URLs, playlists and lookalike YouTube domains are rejected. No server-side remote URL fetch or video-file upload is introduced.

## API

All routes use the existing `/api/v1` prefix and JWT sessions.

| Method | Route                   | Access                                                    |
| ------ | ----------------------- | --------------------------------------------------------- |
| GET    | `/meditation/content`   | Signed-in users; published items only                     |
| GET    | `/admin/meditation`     | Super-admin; all statuses                                 |
| GET    | `/admin/meditation/:id` | Super-admin                                               |
| POST   | `/admin/meditation`     | Super-admin; creates a draft by default                   |
| PATCH  | `/admin/meditation/:id` | Super-admin; full editor payload plus `expectedUpdatedAt` |
| DELETE | `/admin/meditation/:id` | Super-admin                                               |

Lists accept `page` (default 1), `limit` (default 24, max 100), optional `search`, `kind` (`video`/`practice`) and `section` (`affirmations`/`meditation`/`breathing`/`grounding`). Responses contain `items`, `page`, `hasNext`, `total`. Order is `sortOrder`, then ID. Public content omits the creator account ID; Hindi fields are returned alongside English so the app can use the user's language with English fallback.

Editor payload fields: `kind`, `section`, `title_en`, `title_hi`, `description_en`, `description_hi`, `preparation_en`, `preparation_hi`, `author`, `youtubeUrl`, `durationSeconds`, `steps`, `repeat`, `published`, `sortOrder`. A step has `title_en`, `title_hi`, `instruction_en`, `instruction_hi`, `seconds`. Practice durations are always derived from steps and repeats, regardless of a submitted duration value. Videos cannot carry practice steps.

## Mobile app

The Meditation page reads the published API instead of a fixed video list. It refreshes on entry and pull-to-refresh, supports pagination, selects translated titles/instructions when available, and keeps the existing timed-session controls. The Explore breathing link opens a published breathing practice. Affirmations and other video sections render the administrator's content and credit.

On first-load network/API failure, a labelled built-in fallback remains usable. A successful empty response stays empty; deleted/unpublished content is not silently restored as fallback. Cached content may remain while offline. Existing active sessions keep their loaded instructions rather than changing a timer mid-session.

## Migration and deployment

`drizzle/0013_meditation_content.sql` creates the content table and seeds the four existing practices and two user-supplied videos as published items, preserving the current library. Seed IDs are stable and inserts do not overwrite existing items. Metadata/journal files are included for the normal Drizzle migration chain.

Build and deploy the backend (including admin static assets and `drizzle`), then run the existing production migration command:

```powershell
npm.cmd run build
npm.cmd run db:migrate:production
```

Restart the hosted backend through its normal deployment process. Install the updated mobile build to consume the library. No hosted migration, administrator creation or production deployment was performed by this task.

## Verification

- Backend build/lint and 108 unit tests pass; the migration chain is applied to isolated embedded PostgreSQL in the new HTTP integration suite.
- HTTP tests cover access controls, the six seed records, draft/public visibility, create/update/publish/unpublish/delete, audit events, stale edit conflicts, seeded-record editing, unsafe links, step validation, server-derived durations and pagination.
- Mobile typecheck/lint and 139 tests pass, including catalog parsing, Hindi fallback, successful-empty-library behavior and labelled offline fallback.
- Actual admin DOM functions were rendered using seeded fixtures for list/video/practice-editor checks at desktop and narrow sizes. Fixtures live under `.impeccable/review/meditation`, generated by `node scripts/preview-meditation-admin.cjs`. These are composition previews, not evidence of a production session. The design detector could not resolve the existing root-relative CSS URL locally; its resulting flat-type warning was checked against the actual styled render.
- Physical-phone and hosted-admin acceptance remain deployment checks.
