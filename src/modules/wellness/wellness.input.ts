import { z } from 'zod';
import { awakeMinutes, flows, moods, symptoms, validDay, validTimezone } from './domain';
const clock = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const day = z.string().refine(validDay, 'Use a valid calendar date.');
const timezone = z.string().refine(validTimezone, 'Choose a valid timezone.');
export const planInput = z
  .object({
    wakeTime: clock,
    sleepTime: clock,
    targetMl: z.number().int().min(100).max(6000),
    servingMl: z.number().int().min(50).max(1000),
    timezone,
    remindersEnabled: z.boolean(),
    pausedUntil: z.iso.datetime().nullable(),
  })
  .strict()
  .refine(
    (p) => awakeMinutes(p) >= 120 && awakeMinutes(p) <= 1320,
    'Waking hours must be between 2 and 22 hours.',
  );
export const cycleInput = z
  .object({
    cycleLength: z.number().int().min(10).max(120),
    periodLength: z.number().int().min(1).max(30),
    predictionsEnabled: z.boolean(),
    remindersEnabled: z.boolean(),
    discreet: z.boolean(),
    reminderDaysBefore: z.number().int().min(0).max(7),
    reminderTime: clock,
    timezone,
  })
  .strict();
export const logInput = z
  .object({
    amountMl: z.number().int().min(1).max(3000),
    loggedAt: z.iso.datetime(),
    taskId: z.string().max(100).nullable().default(null),
  })
  .strict();
export const taskInput = z
  .object({
    day,
    status: z.enum(['pending', 'skipped']),
    snoozedUntil: z.iso.datetime().nullable(),
  })
  .strict();
export const periodInput = z.object({ startDate: day, endDate: day.nullable() }).strict();
export const entryInput = z
  .object({
    flow: z.enum(flows),
    symptoms: z
      .array(z.enum(symptoms))
      .max(8)
      .refine((a) => new Set(a).size === a.length),
    mood: z.enum(moods).nullable(),
    notes: z.string().max(1000),
  })
  .strict();
