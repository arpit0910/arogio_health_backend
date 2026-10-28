import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { and, desc, eq, gte } from 'drizzle-orm';
import { z } from 'zod';
import { DatabaseService } from '../../database/database.service';
import {
  users,
  wellnessSettings as settings,
  waterLogs as logs,
  waterTaskStates as tasks,
  cyclePeriods as periods,
  cycleEntries as entries,
} from '../../database/schema';
import { addDays, localDay, validDay, waterDay, waterSchedule, waterWindow } from './domain';
import * as input from './wellness.input';

@Injectable()
export class WellnessService {
  constructor(private readonly database: DatabaseService) {}
  private parse<T>(schema: z.ZodType<T>, body: unknown): T {
    const result = schema.safeParse(body);
    if (!result.success)
      throw new BadRequestException(
        result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(' '),
      );
    return result.data;
  }
  private uuid(id: string) {
    return this.parse(z.uuid(), id);
  }
  // Serialize mutations for one account, including period overlap checks and idempotent logs.
  private async mutate(
    userId: string,
    operation: (
      tx: Parameters<Parameters<DatabaseService['db']['transaction']>[0]>[0],
    ) => Promise<void>,
  ) {
    await this.database.db.transaction(async (tx) => {
      await tx.select({ id: users.id }).from(users).where(eq(users.id, userId)).for('update');
      await operation(tx);
    });
    return this.snapshot(userId);
  }
  async snapshot(userId: string) {
    const db = this.database.db,
      cutoff = addDays(localDay(new Date(), 'UTC'), -90);
    const [preferences, water, states, history, daily] = await Promise.all([
      db.select().from(settings).where(eq(settings.userId, userId)),
      db
        .select()
        .from(logs)
        .where(and(eq(logs.userId, userId), gte(logs.day, cutoff)))
        .orderBy(desc(logs.loggedAt))
        .limit(3000),
      db
        .select()
        .from(tasks)
        .where(and(eq(tasks.userId, userId), gte(tasks.day, cutoff))),
      db.select().from(periods).where(eq(periods.userId, userId)).orderBy(desc(periods.startDate)),
      db
        .select()
        .from(entries)
        .where(eq(entries.userId, userId))
        .orderBy(desc(entries.day))
        .limit(730),
    ]);
    return {
      waterPlan: preferences[0]?.waterPlan ?? null,
      cycleSettings: preferences[0]?.cycleSettings ?? null,
      waterLogs: water.map((row) => ({
        id: row.id,
        amountMl: row.amountMl,
        loggedAt: row.loggedAt.toISOString(),
        day: row.day,
        targetMl: row.targetMl,
        taskId: row.taskId,
      })),
      waterTasks: states.map((row) => ({
        taskId: row.taskId,
        day: row.day,
        status: row.status,
        snoozedUntil: row.snoozedUntil?.toISOString() ?? null,
      })),
      periods: history.map((row) => ({
        id: row.id,
        startDate: row.startDate,
        endDate: row.endDate,
      })),
      cycleEntries: daily.map((row) => ({
        day: row.day,
        flow: row.flow,
        symptoms: row.symptoms,
        mood: row.mood,
        notes: row.notes,
      })),
    };
  }
  savePlan(userId: string, body: unknown) {
    const plan = this.parse(input.planInput, body);
    if (plan.pausedUntil && Date.parse(plan.pausedUntil) > Date.now() + 32 * 86400000)
      throw new BadRequestException('Pause for up to 31 days, or turn reminders off.');
    return this.mutate(userId, async (tx) => {
      const [current] = await tx.select().from(settings).where(eq(settings.userId, userId));
      const old = current?.waterPlan;
      const same =
        old &&
        ['wakeTime', 'sleepTime', 'targetMl', 'servingMl', 'timezone'].every(
          (key) => old[key as keyof typeof old] === plan[key as keyof typeof plan],
        );
      const waterPlan = { ...plan, version: same ? old.version : randomUUID() };
      await tx
        .insert(settings)
        .values({ userId, waterPlan })
        .onConflictDoUpdate({ target: settings.userId, set: { waterPlan, updatedAt: new Date() } });
    });
  }
  saveLog(userId: string, id: string, body: unknown) {
    this.uuid(id);
    const log = this.parse(input.logInput, body),
      now = new Date(),
      at = new Date(log.loggedAt);
    if (at.getTime() > now.getTime() + 60000 || at.getTime() < now.getTime() - 7 * 86400000)
      throw new BadRequestException('Log water within the last seven days.');
    return this.mutate(userId, async (tx) => {
      const [existing] = await tx.select().from(logs).where(eq(logs.id, id));
      if (existing) {
        if (
          existing.userId !== userId ||
          existing.amountMl !== log.amountMl ||
          existing.loggedAt.getTime() !== at.getTime() ||
          existing.taskId !== log.taskId
        )
          throw new ConflictException(
            'This log ID is already in use. Refresh before trying again.',
          );
        return;
      }
      const [row] = await tx.select().from(settings).where(eq(settings.userId, userId));
      const plan = row?.waterPlan;
      if (!plan) throw new BadRequestException('Set up your water plan first.');
      const day = waterDay(plan, at);
      if (log.taskId) {
        const currentLogs = await tx
          .select()
          .from(logs)
          .where(and(eq(logs.userId, userId), eq(logs.day, day)));
        const task = waterSchedule(
          plan,
          day,
          currentLogs.map((row) => ({ ...row, loggedAt: row.loggedAt.toISOString() })),
        ).find((t) => t.id === log.taskId);
        if (!task)
          throw new BadRequestException('This drinking task has changed. Refresh your plan.');
        const [already] = await tx
          .select()
          .from(logs)
          .where(and(eq(logs.userId, userId), eq(logs.taskId, log.taskId)));
        if (already) return;
        if (log.amountMl !== task.remainingMl || task.remainingMl === 0)
          throw new ConflictException('This task has changed. Reload tracking before logging it.');
      }
      await tx
        .insert(logs)
        .values({ id, userId, ...log, loggedAt: at, day, targetMl: plan.targetMl });
    });
  }
  deleteLog(userId: string, id: string) {
    this.uuid(id);
    return this.mutate(userId, async (tx) => {
      await tx.delete(logs).where(and(eq(logs.userId, userId), eq(logs.id, id)));
    });
  }
  saveTask(userId: string, taskId: string, body: unknown) {
    const state = this.parse(input.taskInput, body);
    return this.mutate(userId, async (tx) => {
      const [row] = await tx.select().from(settings).where(eq(settings.userId, userId));
      const plan = row?.waterPlan;
      if (
        !plan ||
        state.day !== waterDay(plan) ||
        !waterSchedule(plan, state.day).some((task) => task.id === taskId)
      )
        throw new BadRequestException('This task has changed. Refresh your plan.');
      if (
        state.snoozedUntil &&
        (Date.parse(state.snoozedUntil) <= Date.now() ||
          Date.parse(state.snoozedUntil) < waterWindow(plan, state.day).start.getTime() ||
          Date.parse(state.snoozedUntil) >= waterWindow(plan, state.day).end.getTime())
      )
        throw new BadRequestException('Choose a snooze time before bedtime.');
      const values = {
        userId,
        taskId,
        ...state,
        snoozedUntil: state.snoozedUntil ? new Date(state.snoozedUntil) : null,
      };
      await tx
        .insert(tasks)
        .values(values)
        .onConflictDoUpdate({ target: [tasks.userId, tasks.taskId], set: values });
    });
  }
  saveCycleSettings(userId: string, body: unknown) {
    const cycleSettings = this.parse(input.cycleInput, body);
    return this.mutate(userId, async (tx) => {
      await tx
        .insert(settings)
        .values({ userId, cycleSettings })
        .onConflictDoUpdate({
          target: settings.userId,
          set: { cycleSettings, updatedAt: new Date() },
        });
    });
  }
  savePeriod(userId: string, id: string, body: unknown) {
    this.uuid(id);
    const period = this.parse(input.periodInput, body);
    return this.mutate(userId, async (tx) => {
      const [preferences] = await tx.select().from(settings).where(eq(settings.userId, userId));
      if (!preferences?.cycleSettings)
        throw new BadRequestException('Set up cycle tracking first.');
      const today = localDay(new Date(), preferences.cycleSettings.timezone);
      if (
        period.startDate > today ||
        (period.endDate && (period.endDate < period.startDate || period.endDate > today))
      )
        throw new BadRequestException(
          'Recorded dates must be in the past or today, with the end after the start.',
        );
      const [existing] = await tx.select().from(periods).where(eq(periods.id, id));
      if (existing && existing.userId !== userId) throw new NotFoundException();
      const all = await tx.select().from(periods).where(eq(periods.userId, userId));
      if (
        all.some(
          (p) =>
            p.id !== id &&
            p.startDate <= (period.endDate ?? '9999-12-31') &&
            period.startDate <= (p.endDate ?? '9999-12-31'),
        )
      )
        throw new ConflictException(
          'These dates overlap another period. End or edit that record first.',
        );
      if (existing) {
        await tx
          .update(periods)
          .set(period)
          .where(and(eq(periods.id, id), eq(periods.userId, userId)));
      } else {
        const inserted = await tx
          .insert(periods)
          .values({ id, userId, ...period })
          .onConflictDoNothing()
          .returning({ id: periods.id });
        if (!inserted.length)
          throw new ConflictException(
            'This record ID is already in use. Reload tracking before trying again.',
          );
      }
    });
  }
  deletePeriod(userId: string, id: string) {
    this.uuid(id);
    return this.mutate(userId, async (tx) => {
      await tx.delete(periods).where(and(eq(periods.userId, userId), eq(periods.id, id)));
    });
  }
  saveEntry(userId: string, day: string, body: unknown) {
    this.parse(
      z
        .string()
        .refine(
          (d) =>
            /^\d{4}-\d{2}-\d{2}$/.test(d) &&
            Number.isFinite(Date.parse(d)) &&
            new Date(d + 'T12:00:00Z').toISOString().slice(0, 10) === d,
        ),
      day,
    );
    const entry = this.parse(input.entryInput, body);
    return this.mutate(userId, async (tx) => {
      const [row] = await tx.select().from(settings).where(eq(settings.userId, userId));
      if (!row?.cycleSettings || day > localDay(new Date(), row.cycleSettings.timezone))
        throw new BadRequestException('Choose today or an earlier date.');
      await tx
        .insert(entries)
        .values({ userId, day, ...entry })
        .onConflictDoUpdate({ target: [entries.userId, entries.day], set: entry });
    });
  }
  deleteEntry(userId: string, day: string) {
    this.parse(z.string().refine(validDay), day);
    return this.mutate(userId, async (tx) => {
      await tx.delete(entries).where(and(eq(entries.userId, userId), eq(entries.day, day)));
    });
  }
  clear(userId: string, feature: 'water' | 'cycle') {
    return this.mutate(userId, async (tx) => {
      if (feature === 'water') {
        await tx.delete(logs).where(eq(logs.userId, userId));
        await tx.delete(tasks).where(eq(tasks.userId, userId));
        await tx
          .update(settings)
          .set({ waterPlan: null, updatedAt: new Date() })
          .where(eq(settings.userId, userId));
      } else {
        await tx.delete(periods).where(eq(periods.userId, userId));
        await tx.delete(entries).where(eq(entries.userId, userId));
        await tx
          .update(settings)
          .set({ cycleSettings: null, updatedAt: new Date() })
          .where(eq(settings.userId, userId));
      }
    });
  }
}
