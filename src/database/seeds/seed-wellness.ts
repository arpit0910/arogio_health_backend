import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { inArray, or, sql } from 'drizzle-orm';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import {
  meditationInput,
  youtubeVideoId,
} from '../../modules/meditation-library/requests/meditation-library.input';
import * as schema from '../schema';
import { meditationSessions } from './meditation-sessions';
import { wellnessVideos } from './wellness-videos';
import { yogaPostureGroups } from './yoga-postures';

const { meditationLibraryItems: items, wellnessPublicationVersions: versions } = schema;
const yogaPreparation: Record<keyof typeof yogaPostureGroups, string> = {
  chair:
    'Use a firm, stable chair on a level surface. Keep the movement small and stop if you feel pain or lose your balance.',
  standing:
    'Use a level, nonslip surface with a sturdy support within reach. Stay within a comfortable range and stop if you feel pain or lose your balance.',
  seated:
    'Use a nonslip mat and sit on a folded blanket if you need more support. Stay within a comfortable range and stop if you feel pain.',
  kneeling:
    'Put padding under your knees and work in a comfortable range. Skip the posture if your knees or wrists hurt.',
  floor:
    'Use a comfortable mat and set out cushions before starting. Change position or stop if you feel pain.',
  balance:
    'Ask a qualified yoga instructor to assess your balance and suggest a version appropriate for you.',
  instructor:
    'Review this posture with a qualified yoga instructor before you try it. Ask for a demonstration and an alternative that suits your experience.',
};

function seedId(section: string, key: string) {
  // A stable UUID allows concurrent runs to insert each entry at most once.
  const bytes = createHash('sha256')
    .update(`arogio:wellness-starter:${section}:${key}`)
    .digest()
    .subarray(0, 16);
  bytes[6] = (bytes[6]! & 0x0f) | 0x80;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  return bytes.toString('hex').replace(/^(........)(....)(....)(....)/, '$1-$2-$3-$4-');
}

function prepareRecord(section: 'meditation' | 'yoga', title: string, data: unknown) {
  const practice = meditationInput.parse(data);
  const videoId = practice.kind === 'video' ? youtubeVideoId(practice.youtubeUrl) : null;
  return {
    id: videoId ? seedId('video', videoId) : seedId(section, title.toLowerCase()),
    kind: practice.kind,
    section,
    title_en: practice.title_en,
    title_hi: practice.title_hi,
    description_en: practice.description_en,
    preparation_en: practice.preparation_en,
    steps: practice.steps,
    author: practice.author,
    videoId,
    published: practice.published,
    sortOrder: practice.sortOrder,
    durationSeconds:
      practice.kind === 'video'
        ? practice.durationSeconds
        : practice.steps.reduce((total, step) => total + step.seconds, 0) * practice.repeat,
  };
}

export function prepareWellnessSeed() {
  const meditation = meditationSessions.map(({ title, description, steps }, index) =>
    prepareRecord('meditation', title, {
      kind: 'practice',
      section: 'meditation',
      title_en: title,
      description_en: description,
      preparation_en:
        'Find a comfortable place to pause. You can keep your eyes open and stop whenever you like.',
      steps: steps.map(([title_en, instruction_en, seconds]) => ({
        title_en,
        instruction_en,
        seconds,
      })),
      sortOrder: 1000 + index,
    }),
  );
  let sortOrder = 2000;
  const yoga = (Object.keys(yogaPostureGroups) as (keyof typeof yogaPostureGroups)[]).flatMap(
    (group) =>
      yogaPostureGroups[group].map(([name, sanskrit, cue, paired]) => {
        const instructorLed = group === 'instructor' || group === 'balance';
        const description = [
          sanskrit && `${sanskrit}.`,
          instructorLed ? 'Instructor-guided posture preview.' : '',
          cue,
        ]
          .filter(Boolean)
          .join(' ');
        return prepareRecord('yoga', name, {
          kind: 'practice',
          section: 'yoga',
          title_en: name,
          description_en: description,
          preparation_en: yogaPreparation[group],
          steps: instructorLed
            ? [
                { title_en: 'Review the posture', instruction_en: description, seconds: 15 },
                {
                  title_en: 'Plan with your instructor',
                  instruction_en:
                    'Ask about the setup, an appropriate modification, and how to come out of the posture. Use this preview as a reference.',
                  seconds: 15,
                },
              ]
            : [
                { title_en: 'Get ready', instruction_en: yogaPreparation[group], seconds: 15 },
                {
                  title_en: paired ? 'Try the first side' : 'Try the posture',
                  instruction_en: cue,
                  seconds: 15,
                },
                ...(paired
                  ? [
                      {
                        title_en: 'Try the other side',
                        instruction_en: `Return to your starting position first. Repeat on the other side. ${cue}`,
                        seconds: 15,
                      },
                    ]
                  : []),
                {
                  title_en: 'Return to rest',
                  instruction_en: 'Move out of the posture slowly and take a comfortable pause.',
                  seconds: 10,
                },
              ],
          sortOrder: sortOrder++,
        });
      }),
  );
  const videos = (['yoga', 'meditation'] as const).flatMap((section) =>
    wellnessVideos[section].map(
      ({ video: [id, title, description, durationSeconds], author, titleHi }, index) =>
        prepareRecord(section, title, {
          kind: 'video',
          section,
          title_en: title,
          title_hi: titleHi,
          description_en: description,
          author,
          youtubeUrl: `https://www.youtube.com/watch?v=${id}`,
          durationSeconds,
          sortOrder: (section === 'yoga' ? 1900 : 1050) + index,
        }),
    ),
  );
  const catalog = [...meditation, ...yoga, ...videos];
  if (new Set(catalog.map(({ id }) => id)).size !== catalog.length)
    throw new Error('Wellness seed contains duplicate entries.');
  return catalog;
}

function titleKey(kind: string, section: string, title: string) {
  return `${kind}:${section}:${title.trim().toLowerCase()}`;
}

export async function seedWellness<
  TQuery extends PgQueryResultHKT,
  TSchema extends Record<string, unknown>,
>(db: PgDatabase<TQuery, TSchema>) {
  const catalog = prepareWellnessSeed();
  const ids = catalog.map(({ id }) => id);
  const titles = catalog.map(({ title_en }) => title_en.toLowerCase());
  const videoIds = catalog.flatMap(({ videoId }) => (videoId ? [videoId] : []));
  return db.transaction(async (tx) => {
    const existing = await tx
      .select({
        id: items.id,
        kind: items.kind,
        section: items.section,
        title: items.title_en,
        videoId: items.videoId,
      })
      .from(items)
      .where(
        or(
          inArray(items.id, ids),
          inArray(sql`lower(trim(${items.title_en}))`, titles),
          inArray(items.videoId, videoIds),
        ),
      );
    const history = await tx
      .selectDistinct({ id: versions.itemId })
      .from(versions)
      .where(inArray(versions.itemId, ids));
    const knownIds = new Set([...existing, ...history].map(({ id }) => id));
    const knownTitles = new Set(
      existing.map(({ kind, section, title }) => titleKey(kind, section, title)),
    );
    const knownVideos = new Set(existing.map(({ videoId }) => videoId));
    const inserts = catalog.filter(
      ({ id, kind, section, title_en, videoId }) =>
        !knownIds.has(id) &&
        !knownTitles.has(titleKey(kind, section, title_en)) &&
        (!videoId || !knownVideos.has(videoId)),
    );
    if (!inserts.length) return { inserted: 0, skipped: catalog.length };

    const updatedAt = new Date();
    const inserted = await tx
      .insert(items)
      .values(inserts.map((item) => ({ ...item, updatedAt })))
      .onConflictDoNothing({ target: items.id })
      .returning({ id: items.id });
    return { inserted: inserted.length, skipped: catalog.length - inserted.length };
  });
}

async function main() {
  const options = process.argv.slice(2);
  if (!options.length) {
    const catalog = prepareWellnessSeed();
    const yoga = catalog.filter(
      ({ kind, section }) => kind === 'practice' && section === 'yoga',
    ).length;
    const meditation = catalog.filter(
      ({ kind, section }) => kind === 'practice' && section === 'meditation',
    ).length;
    const videos = catalog.length - yoga - meditation;
    console.log(
      `Validated ${yoga} written yoga postures, ${meditation} timed meditation sessions, and ${videos} videos. Use --apply or --local to import drafts.`,
    );
    return;
  }
  if (options.length !== 1 || !['--apply', '--local'].includes(options[0]!))
    throw new Error('Expected --apply, --local, or no arguments.');
  const { inserted, skipped } =
    options[0] === '--local' ? await seedEmbeddedDatabase() : await seedPostgres();
  console.log(`Inserted ${inserted} wellness drafts. Skipped ${skipped} existing entries.`);
}

async function seedPostgres() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required with --apply.');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 1,
    connectionTimeoutMillis: 10_000,
  });
  try {
    return await seedWellness(drizzle({ client: pool, schema }));
  } catch {
    throw new Error(
      'Could not insert wellness drafts. Check the database connection and applied migrations.',
    );
  } finally {
    await pool.end();
  }
}

async function seedEmbeddedDatabase() {
  const { PGlite } = await import('@electric-sql/pglite');
  const { drizzle: drizzleLocal } = await import('drizzle-orm/pglite');
  // Reuse the embedded migration runner used by the local API.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { migrateLocal } = require('../../../scripts/database/migrate-local.cjs') as {
    migrateLocal: (db: InstanceType<typeof PGlite>, folder: string) => Promise<void>;
  };
  const database = new PGlite(resolve('.local/database'));
  try {
    await migrateLocal(database, resolve('database/migrations'));
    return await seedWellness(drizzleLocal(database, { schema }));
  } finally {
    await database.close();
  }
}

if (require.main === module)
  void main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : 'Wellness seed failed.');
    process.exitCode = 1;
  });
