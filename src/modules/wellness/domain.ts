export const APP_TIMEZONE = 'Asia/Kolkata';
/** Calendar dates are plain ISO dates, never UTC-serialized local midnights. */
export type WaterPlan = {
  version: string;
  wakeTime: string;
  sleepTime: string;
  targetMl: number;
  servingMl: number;
  timezone: string;
  remindersEnabled: boolean;
  pausedUntil: string | null;
};
export type CycleSettings = {
  cycleLength: number;
  periodLength: number;
  predictionsEnabled: boolean;
  remindersEnabled: boolean;
  discreet: boolean;
  reminderDaysBefore: number;
  reminderTime: string;
  timezone: string;
};
export type WaterLog = {
  id: string;
  amountMl: number;
  loggedAt: string;
  day: string;
  targetMl: number;
  taskId: string | null;
};
export type WaterTaskState = {
  taskId: string;
  day: string;
  status: 'pending' | 'skipped';
  snoozedUntil: string | null;
};
export type Period = { id: string; startDate: string; endDate: string | null };
export const symptoms = [
  'cramps',
  'bloating',
  'headache',
  'fatigue',
  'back_pain',
  'breast_tenderness',
  'acne',
  'nausea',
] as const;
export const moods = ['calm', 'happy', 'low', 'irritable', 'anxious'] as const;
export const flows = ['none', 'spotting', 'light', 'medium', 'heavy'] as const;
export type CycleEntry = {
  day: string;
  flow: (typeof flows)[number];
  symptoms: string[];
  mood: string | null;
  notes: string;
};
export type WellnessData = {
  waterPlan: WaterPlan | null;
  cycleSettings: CycleSettings | null;
  waterLogs: WaterLog[];
  waterTasks: WaterTaskState[];
  periods: Period[];
  cycleEntries: CycleEntry[];
};
export type WaterTask = {
  id: string;
  day: string;
  at: string;
  amountMl: number;
  remainingMl: number;
  status: 'pending' | 'done' | 'skipped' | 'missed';
  snoozedUntil: string | null;
};
export const emptyWellness = (): WellnessData => ({
  waterPlan: null,
  cycleSettings: null,
  waterLogs: [],
  waterTasks: [],
  periods: [],
  cycleEntries: [],
});
export const defaultCycleSettings = (timezone: string): CycleSettings => ({
  cycleLength: 28,
  periodLength: 5,
  predictionsEnabled: true,
  remindersEnabled: false,
  discreet: true,
  reminderDaysBefore: 2,
  reminderTime: '09:00',
  timezone,
});
export function validDay(day: string): boolean {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(day) &&
    Number.isFinite(Date.parse(day)) &&
    new Date(day + 'T12:00:00Z').toISOString().slice(0, 10) === day
  );
}
export function addDays(day: string, amount: number): string {
  const date = new Date(day + 'T12:00:00Z');
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}
export function daysBetween(first: string, second: string): number {
  return Math.round(
    (Date.parse(second + 'T12:00:00Z') - Date.parse(first + 'T12:00:00Z')) / 86400000,
  );
}
export function validTimezone(timezone: string): boolean {
  try {
    new Intl.DateTimeFormat('en', { timeZone: timezone }).format();
    return true;
  } catch {
    return false;
  }
}
function zonedParts(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)!.value;
  return {
    day: `${get('year')}-${get('month')}-${get('day')}`,
    time: `${get('hour')}:${get('minute')}`,
  };
}
export function localDay(date = new Date(), timezone = APP_TIMEZONE): string {
  return zonedParts(date, timezone).day;
}
export function clockMinutes(time: string): number {
  const [hours = 0, minutes = 0] = time.split(':').map(Number);
  return hours * 60 + minutes;
}
export function awakeMinutes(plan: Pick<WaterPlan, 'wakeTime' | 'sleepTime'>): number {
  return (clockMinutes(plan.sleepTime) - clockMinutes(plan.wakeTime) + 1440) % 1440;
}
/** Resolve DST folds to their first occurrence; move nonexistent spring times forward. */
export function zonedInstant(day: string, time: string, timezone: string): Date {
  const wanted = Date.parse(`${day}T${time}:00Z`);
  let guess = wanted;
  const offsets = new Set<number>();
  for (let pass = 0; pass < 4; pass++) {
    const parts = zonedParts(new Date(guess), timezone);
    const offset = Date.parse(`${parts.day}T${parts.time}:00Z`) - guess;
    offsets.add(offset);
    guess = wanted - offset;
  }
  for (const change of [-7200000, 7200000]) {
    const candidate = guess + change,
      parts = zonedParts(new Date(candidate), timezone);
    offsets.add(Date.parse(`${parts.day}T${parts.time}:00Z`) - candidate);
  }
  const matches = [...offsets]
    .map((offset) => wanted - offset)
    .filter((candidate) => {
      const parts = zonedParts(new Date(candidate), timezone);
      return parts.day === day && parts.time === time;
    });
  if (matches.length) return new Date(Math.min(...matches));
  // A clock time skipped by a DST change becomes the first valid local minute after it.
  let best: { instant: number; local: number } | undefined;
  for (let minute = -120; minute <= 120; minute++) {
    const instant = guess + minute * 60000,
      parts = zonedParts(new Date(instant), timezone);
    const local = Date.parse(`${parts.day}T${parts.time}:00Z`);
    if (
      local >= wanted &&
      (!best || local < best.local || (local === best.local && instant < best.instant))
    )
      best = { instant, local };
  }
  if (!best) throw new Error('Unable to resolve this local time.');
  return new Date(best.instant);
}
export function waterDay(plan: WaterPlan, now = new Date()): string {
  const parts = zonedParts(now, APP_TIMEZONE);
  return clockMinutes(plan.sleepTime) < clockMinutes(plan.wakeTime) &&
    clockMinutes(parts.time) < clockMinutes(plan.sleepTime)
    ? addDays(parts.day, -1)
    : parts.day;
}
export function waterWindow(plan: WaterPlan, day: string) {
  const endDay = plan.sleepTime <= plan.wakeTime ? addDays(day, 1) : day;
  return {
    start: zonedInstant(day, plan.wakeTime, APP_TIMEZONE),
    end: zonedInstant(endDay, plan.sleepTime, APP_TIMEZONE),
  };
}
export function waterSchedule(
  plan: WaterPlan,
  day: string,
  logs: WaterLog[] = [],
  states: WaterTaskState[] = [],
  now = new Date(),
): WaterTask[] {
  const count = Math.min(16, Math.max(1, Math.ceil(plan.targetMl / plan.servingMl)));
  const { start, end } = waterWindow(plan, day);
  const daily = logs.filter((log) => log.day === day);
  const taskIds = new Set(
    Array.from({ length: count }, (_, index) => `${day}:${plan.version}:${index}`),
  );
  let available = daily
    .filter((log) => !log.taskId || !taskIds.has(log.taskId))
    .reduce((sum, log) => sum + log.amountMl, 0);
  return Array.from({ length: count }, (_, index) => {
    const amount =
      Math.floor((plan.targetMl * (index + 1)) / count) -
      Math.floor((plan.targetMl * index) / count);
    const id = `${day}:${plan.version}:${index}`,
      state = states.find((item) => item.taskId === id);
    const direct = daily
      .filter((log) => log.taskId === id)
      .reduce((sum, log) => sum + log.amountMl, 0);
    const unfilled = Math.max(0, amount - direct),
      credited = Math.min(unfilled, available);
    const remainingMl = unfilled - credited;
    available -= credited;
    const at = new Date(
      Math.floor(
        (start.getTime() + ((end.getTime() - start.getTime()) * (index + 0.5)) / count) / 60000,
      ) * 60000,
    ).toISOString();
    const due = state?.snoozedUntil ?? at;
    const status =
      remainingMl === 0
        ? 'done'
        : state?.status === 'skipped'
          ? 'skipped'
          : Date.parse(due) < now.getTime()
            ? 'missed'
            : 'pending';
    return {
      id,
      day,
      at,
      amountMl: amount,
      remainingMl,
      status,
      snoozedUntil: state?.snoozedUntil ?? null,
    };
  });
}
export function cycleForecast(periods: Period[], settings: CycleSettings | null, today: string) {
  if (!settings?.predictionsEnabled || !periods.length) return null;
  const ordered = [...periods]
    .filter((period) => period.startDate <= today)
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
  const last = ordered.at(-1);
  if (!last) return null;
  const intervals = ordered
    .slice(1)
    .map((period, index) => daysBetween(ordered[index]!.startDate, period.startDate))
    .filter((days) => days >= 10 && days <= 120)
    .slice(-6);
  const sorted = [...intervals].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  const length = sorted.length
    ? Math.round(sorted.length % 2 ? sorted[middle]! : (sorted[middle - 1]! + sorted[middle]!) / 2)
    : settings.cycleLength;
  const spread =
    intervals.length > 1
      ? Math.max(2, Math.ceil((Math.max(...intervals) - Math.min(...intervals)) / 2))
      : 3;
  const expected = addDays(last.startDate, length);
  return {
    expected,
    earliest: addDays(expected, -spread),
    latest: addDays(expected, spread),
    length,
    intervals: intervals.length,
    variable: spread > 7,
    overdue: expected < today,
    cycleDay: daysBetween(last.startDate, today) + 1,
  };
}
