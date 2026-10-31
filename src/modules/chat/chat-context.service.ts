import { Injectable } from '@nestjs/common';
import { and, desc, eq, gte, lte, sql } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import {
  users,
  wellnessSettings,
  waterLogs,
  cyclePeriods,
  cycleEntries,
} from '../../database/schema';
import { APP_TIMEZONE, addDays, localDay, validDay, activityMetricKeys } from '../wellness/domain';

function text(value: unknown, max = 80): string | null {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : null;
}
function number(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}
function metrics(value: Partial<Record<(typeof activityMetricKeys)[number], number>>) {
  return Object.fromEntries(
    activityMetricKeys.flatMap((key) => (number(value[key]) == null ? [] : [[key, value[key]]])),
  );
}

@Injectable()
export class ChatContextService {
  constructor(private readonly database: DatabaseService) {}
  async forUser(userId: string, now = new Date()) {
    const today = localDay(now, APP_TIMEZONE),
      cutoff = addDays(today, -6),
      db = this.database.db;
    const [profile, settings, water, periods, entries] = await Promise.all([
      db
        .select({ heightCm: users.heightCm, weightKg: users.weightKg, setup: users.profileSetup })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1),
      db
        .select({
          activity: wellnessSettings.activityTracking,
          water: wellnessSettings.waterPlan,
          medicines: wellnessSettings.medicines,
          cycle: wellnessSettings.cycleSettings,
          updatedAt: wellnessSettings.updatedAt,
        })
        .from(wellnessSettings)
        .where(eq(wellnessSettings.userId, userId))
        .limit(1),
      db
        .select({
          day: waterLogs.day,
          loggedMl: sql<number>`sum(${waterLogs.amountMl})`.mapWith(Number),
        })
        .from(waterLogs)
        .where(
          and(eq(waterLogs.userId, userId), gte(waterLogs.day, cutoff), lte(waterLogs.day, today)),
        )
        .groupBy(waterLogs.day)
        .orderBy(desc(waterLogs.day))
        .limit(7),
      db
        .select({ startDate: cyclePeriods.startDate, endDate: cyclePeriods.endDate })
        .from(cyclePeriods)
        .where(and(eq(cyclePeriods.userId, userId), lte(cyclePeriods.startDate, today)))
        .orderBy(desc(cyclePeriods.startDate))
        .limit(3),
      db
        .select({
          day: cycleEntries.day,
          flow: cycleEntries.flow,
          symptoms: cycleEntries.symptoms,
          mood: cycleEntries.mood,
        })
        .from(cycleEntries)
        .where(
          and(
            eq(cycleEntries.userId, userId),
            gte(cycleEntries.day, cutoff),
            lte(cycleEntries.day, today),
          ),
        )
        .orderBy(desc(cycleEntries.day))
        .limit(7),
    ]);
    const p = profile[0],
      setup = p?.setup ?? {},
      saved = settings[0];
    const dob = text(setup.dateOfBirth),
      birth = dob && validDay(dob) && dob <= today ? dob : null;
    const age = birth
      ? Number(today.slice(0, 4)) -
        Number(birth.slice(0, 4)) -
        (today.slice(5) < birth.slice(5) ? 1 : 0)
      : null;
    const medicines = saved?.medicines ?? [];
    return {
      asOf: now.toISOString(),
      timezone: APP_TIMEZONE,
      range: { from: cutoff, through: today },
      source:
        'User-entered, backend-saved records; not clinically verified. Missing entries are unknown, not zero.',
      profile: {
        ageYears: age != null && age >= 0 && age <= 120 ? age : null,
        heightCm: number(p?.heightCm),
        weightKg: number(p?.weightKg),
        activityLevel: text(setup.activityLevel),
        healthGoals: Array.isArray(setup.healthGoals)
          ? setup.healthGoals.flatMap((value) => (text(value) ? [text(value)] : [])).slice(0, 10)
          : [],
      },
      activity: {
        goals: metrics(saved?.activity.goals ?? {}),
        days: (saved?.activity.days ?? [])
          .filter((day) => validDay(day.day) && day.day >= cutoff && day.day <= today)
          .sort((a, b) => b.day.localeCompare(a.day))
          .slice(0, 7)
          .map((day) => ({ day: day.day, values: metrics(day.values) })),
      },
      water: { targetMl: saved?.water?.targetMl ?? null, loggedDailyTotals: water },
      medicines: {
        totalSaved: medicines.length,
        entries: medicines
          .slice(0, 20)
          .map((medicine) => ({
            name: text(medicine.name),
            remindersEnabled: medicine.enabled,
            scheduledDoses: medicine.doses
              .slice(0, 4)
              .map((dose) => ({ time: text(dose.time, 5), amount: text(dose.amount, 40) })),
          })),
        note: 'These are saved schedules, not evidence of prescriptions, doses taken or adherence.',
      },
      cycle: {
        recordedCycleLength: saved?.cycle?.cycleLength ?? null,
        recordedPeriodLength: saved?.cycle?.periodLength ?? null,
        recentPeriods: periods,
        recentCheckIns: entries.map((entry) => ({
          ...entry,
          symptoms: entry.symptoms.slice(0, 8).map((value) => text(value, 30)),
          mood: text(entry.mood, 30),
        })),
      },
      unavailable: [
        'Phone sensor totals and Health Connect readings stored only on the device',
        'Medical documents not stored by the daily-care backend',
      ],
    };
  }
}
