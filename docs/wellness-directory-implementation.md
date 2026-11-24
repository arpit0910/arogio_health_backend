# Wellness and Directory Implementation

The November 24 specification and shared discussion describe two workstreams. This repository uses NestJS, Drizzle and PostgreSQL. The mobile repository uses Expo and TypeScript. The API already has authenticated account routes, a super-admin portal and an audit service. The wellness catalog already publishes bilingual timed practices and embedded videos. The mobile player already pauses on interruptions and holds the loaded practice in memory.

Hospitals, doctors and blood banks have separate tables with stable IDs and existing import and correction flows. Doctor affiliations and provider images already have storage. The existing fields alone cannot establish entrance precision, contact verification or photo rights.

## Delivery sequence

1. Preserve published wellness manifests and establish a read-only directory baseline by city.
2. Add draft revisions, separate review and publication permissions, rights evidence and approved media references. Keep existing IDs and API fields through an additive migration.
3. Extend the session player and persist progress against a pinned version. Add favorites, reminders and interruption recovery.
4. Review and publish original content after rights and instructor approval. The requested pose and session counts are launch targets.
5. Stage approved directory sources, match candidates to existing IDs, and require a reviewer before applying any change. Run the Jaipur pilot with up to 100 existing listings, then report completeness and approved provenance.
6. Verify media rights, provider identity, accessibility, rollback and staging before production rollout.

## Directory baseline

Run `node --env-file=.env.local scripts/database/audit-directory.cjs --city Jaipur --limit 100` against the intended review database. The command runs in a read-only transaction and returns aggregate presence counts for a balanced sample across the three listing types. It reports photo storage separately and does not treat present values as verified. No external source is enabled by the command.

## Published versions

Migration 0027 captures a baseline for already-published content. Each subsequent publication saves a new immutable manifest alongside the existing public item. Admin version history remains available after unpublishing or deleting a listing. Historical manifests are private to authorized admins. This phase records version history and does not certify historical media or instructor review.


## Completed practice history

Migration 0028 adds account-owned history keyed by an attempt ID and the
published item version. Completed practice time must match the version's
timed manifest. Retrying the same attempt returns the original receipt.
Practice titles come from the saved version, even after a catalog edit.

Signed-in users can save a completed practice from the player and review
recent entries and all-time totals. Partial checkpoints, offline delivery,
streaks, favorites and reminders are pending.


## Import and approve directory listings

Use the Hospitals, Doctors or Blood Banks tab and upload a CSV or XLSX file
from the source you choose. Use the supplied template for unusual headings.
Common headings such as Hospital Name, Doctor Name, Blood Bank ID, Address
and Postal Code are recognized. Source URL and unsupported metadata columns
are ignored by directory imports. Website is a separate contact field.

Keep the same stable import ID on future files for the same listing. The new
templates label this field `record_key` for hospitals, doctors, departments,
and diseases, and `id` for blood banks and articles. Older directory templates
with `source_key` still match the same records. Admin-created records receive
an identifier automatically. The import preview reports validation errors and
which records will be created, updated, or returned for review.

From an edited record, check **Review this listing after saving** to continue
straight to approval. To review imported files, use **Review / approve** on a
row or select ready records for bulk approval. The signed-in account and
review time are recorded. Approve using the listing's core information.
Medicine Library publication also requires a clinical reviewer and review notes.
