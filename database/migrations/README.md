# SQL migrations

These are the authoritative, ordered SQL migrations. Run `npm run db:list` from the repository root to locate/list them. The generator and runners use this directory.

| File | Main purpose |
| --- | --- |
| [0000_flowery_sebastian_shaw.sql](0000_flowery_sebastian_shaw.sql) | Initial account, external identity and refresh-session tables/enums |
| [0001_sharp_zarda.sql](0001_sharp_zarda.sql) | Refresh-session replacement foreign key |
| [0002_glamorous_gauntlet.sql](0002_glamorous_gauntlet.sql) | Metric height and weight columns |
| [0003_smiling_bulldozer.sql](0003_smiling_bulldozer.sql) | Entered measurement units and values |
| [0004_handy_captain_universe.sql](0004_handy_captain_universe.sql) | Profile setup and completion state |
| [0005_majestic_skreet.sql](0005_majestic_skreet.sql) | Personal wellness settings, water and cycle tracking |
| [0006_icy_skin.sql](0006_icy_skin.sql) | Saved medicine schedules |
| [0007_daily_activity_targets.sql](0007_daily_activity_targets.sql) | Daily activity targets and journal |
| [0008_fine_wild_pack.sql](0008_fine_wild_pack.sql) | Permanent referral codes and attribution |
| [0009_minor_green_goblin.sql](0009_minor_green_goblin.sql) | Account deletion/recovery timestamps |
| [0010_pretty_nekra.sql](0010_pretty_nekra.sql) | Administration, audit and content support |
| [0011_articles_blood_banks.sql](0011_articles_blood_banks.sql) | Articles and blood-bank directory |
| [0012_jazzy_princess_powerful.sql](0012_jazzy_princess_powerful.sql) | Article categories and related content updates |
| [0013_meditation_content.sql](0013_meditation_content.sql) | Meditation content |
| [0014_care_directory.sql](0014_care_directory.sql) | Healthcare providers and doctor affiliations |
| [0015_blood_bank_provenance.sql](0015_blood_bank_provenance.sql) | Blood-bank source provenance |
| [0016_bank_corrections.sql](0016_bank_corrections.sql) | Blood-bank correction workflow |
| [0017_lean_doorman.sql](0017_lean_doorman.sql) | Individual medicine dose logs |

`meta/_journal.json` defines the committed order and identity. `meta/*_snapshot.json` contains Drizzle's schema snapshots. Keep those files alongside the SQL when deploying.

Historical generated names are retained because these migrations may already have been applied. Their contents and metadata are unchanged by the folder reorganization. Use descriptive names for new migrations, for example `npm run db:generate -- --name=add_provider_contacts`.

See [the database guide](../README.md) for migration, seed, test and production commands.

## Descriptive names

[0018_descriptive_domain_names.sql](0018_descriptive_domain_names.sql) renames application tables, constraints and indexes while preserving rows and columns. See [the table catalog](../TABLES.md).

## Medical departments

[0019_medical_departments.sql](0019_medical_departments.sql) adds the empty, independently approved department taxonomy. No seed records or doctor/disease relationships are added.

## Hospitals

[0020_hospitals.sql](0020_hospitals.sql) adds structured hospital profiles with the same UUID as their shared care entry. No hospital, doctor or affiliation data is seeded.

`0021_medical_diseases` adds the approved bilingual disease catalog and department foreign key. `0022_doctors` adds structured profiles, department links and hospital affiliations with recorded schedules. Both migrations create empty tables and preserve existing care IDs; neither imports or seeds data.

`0023_provider_images` adds database-backed primary photos and image metadata to Doctors/Hospitals, and compatibility image URLs/alt text to care entries. It creates no application tables and imports no records.
