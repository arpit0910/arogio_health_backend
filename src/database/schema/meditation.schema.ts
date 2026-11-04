import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  jsonb,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { users } from './users.schema';

export type MeditationStep = {
  title_en: string;
  title_hi: string;
  instruction_en: string;
  instruction_hi: string;
  seconds: number;
};
export const meditationContent = pgTable(
  'meditation_content',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    kind: text('kind').$type<'video' | 'practice'>().notNull(),
    section: text('section')
      .$type<'affirmations' | 'meditation' | 'breathing' | 'grounding'>()
      .notNull(),
    title_en: text('title_en').notNull(),
    title_hi: text('title_hi').notNull().default(''),
    description_en: text('description_en').notNull().default(''),
    description_hi: text('description_hi').notNull().default(''),
    preparation_en: text('preparation_en').notNull().default(''),
    preparation_hi: text('preparation_hi').notNull().default(''),
    author: text('author').notNull().default(''),
    videoId: text('video_id'),
    durationSeconds: integer('duration_seconds'),
    steps: jsonb('steps').$type<MeditationStep[]>().notNull().default([]),
    repeat: integer('repeat').notNull().default(1),
    published: boolean('published').notNull().default(false),
    sortOrder: integer('sort_order').notNull().default(0),
    createdBy: uuid('created_by').references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('meditation_public_order').on(t.published, t.sortOrder, t.id)],
);
