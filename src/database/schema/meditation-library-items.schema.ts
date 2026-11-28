import {
  boolean,
  foreignKey,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { userAccounts } from './user-accounts.schema';
export type MeditationStep = {
  title_en: string;
  title_hi: string;
  instruction_en: string;
  instruction_hi: string;
  seconds: number;
  sanskritName?: string;
  imageUrl?: string;
  impact_en?: string;
  impact_hi?: string;
  videoId?: string | null;
  phase?: 'warmup' | 'main' | 'cooldown';
};
export const meditationLibraryItems = pgTable(
  'meditation_library_items',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    kind: text('kind').$type<'video' | 'practice'>().notNull(),
    section: text('section')
      .$type<'affirmations' | 'meditation' | 'breathing' | 'grounding' | 'yoga' | 'focus' | 'rest'>()
      .notNull(),
    title_en: text('title_en').notNull(),
    title_hi: text('title_hi').notNull().default(''),
    description_en: text('description_en').notNull().default(''),
    description_hi: text('description_hi').notNull().default(''),
    preparation_en: text('preparation_en').notNull().default(''),
    preparation_hi: text('preparation_hi').notNull().default(''),
    impact_en: text('impact_en').notNull().default(''),
    impact_hi: text('impact_hi').notNull().default(''),
    sanskritName: text('sanskrit_name').notNull().default(''),
    difficulty: text('difficulty').$type<'gentle' | 'beginner' | 'intermediate'>().notNull().default('gentle'),
    imageUrl: text('image_url').notNull().default(''),
    audioUrl: text('audio_url').notNull().default(''),
    author: text('author').notNull().default(''),
    videoId: text('video_id'),
    durationSeconds: integer('duration_seconds'),
    steps: jsonb('steps').$type<MeditationStep[]>().notNull().default([]),
    repeat: integer('repeat').notNull().default(1),
    published: boolean('published').notNull().default(false),
    publishedVersion: integer('published_version').notNull().default(0),
    sortOrder: integer('sort_order').notNull().default(0),
    createdBy: uuid('created_by').references(() => userAccounts.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('meditation_public_order').on(t.published, t.sortOrder, t.id)],
);

// Deliberately retain publication history after a catalog item is deleted.
export const wellnessPublicationVersions = pgTable(
  'wellness_publication_versions',
  {
    itemId: uuid('item_id').notNull(),
    version: integer('version').notNull(),
    manifest: jsonb('manifest').$type<Record<string, unknown>>().notNull(),
    publishedBy: uuid('published_by'),
    publishedAt: timestamp('published_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.itemId, table.version] })],
);

export const wellnessPracticeHistory = pgTable(
  'wellness_practice_history',
  {
    userId: uuid('user_id').notNull().references(() => userAccounts.id, { onDelete: 'cascade' }),
    attemptId: uuid('attempt_id').notNull(),
    itemId: uuid('item_id').notNull(),
    version: integer('version').notNull(),
    elapsedSeconds: integer('elapsed_seconds').notNull(),
    completedAt: timestamp('completed_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.attemptId] }),
    foreignKey({ columns: [table.itemId, table.version], foreignColumns: [wellnessPublicationVersions.itemId, wellnessPublicationVersions.version] }),
    index('wellness_practice_history_recent').on(table.userId, table.completedAt.desc(), table.attemptId),
  ],
);
