"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultCycleSettings = exports.emptyWellness = exports.flows = exports.moods = exports.symptoms = exports.APP_TIMEZONE = void 0;
exports.validDay = validDay;
exports.addDays = addDays;
exports.daysBetween = daysBetween;
exports.validTimezone = validTimezone;
exports.localDay = localDay;
exports.clockMinutes = clockMinutes;
exports.awakeMinutes = awakeMinutes;
exports.zonedInstant = zonedInstant;
exports.waterDay = waterDay;
exports.waterWindow = waterWindow;
exports.waterSchedule = waterSchedule;
exports.cycleForecast = cycleForecast;
exports.APP_TIMEZONE = 'Asia/Kolkata';
exports.symptoms = [
    'cramps',
    'bloating',
    'headache',
    'fatigue',
    'back_pain',
    'breast_tenderness',
    'acne',
    'nausea',
];
exports.moods = ['calm', 'happy', 'low', 'irritable', 'anxious'];
exports.flows = ['none', 'spotting', 'light', 'medium', 'heavy'];
const emptyWellness = () => ({
    waterPlan: null,
    cycleSettings: null,
    waterLogs: [],
    waterTasks: [],
    periods: [],
    cycleEntries: [],
});
exports.emptyWellness = emptyWellness;
const defaultCycleSettings = (timezone) => ({
    cycleLength: 28,
    periodLength: 5,
    predictionsEnabled: true,
    remindersEnabled: false,
    discreet: true,
    reminderDaysBefore: 2,
    reminderTime: '09:00',
    timezone,
});
exports.defaultCycleSettings = defaultCycleSettings;
function validDay(day) {
    return (/^\d{4}-\d{2}-\d{2}$/.test(day) &&
        Number.isFinite(Date.parse(day)) &&
        new Date(day + 'T12:00:00Z').toISOString().slice(0, 10) === day);
}
function addDays(day, amount) {
    const date = new Date(day + 'T12:00:00Z');
    date.setUTCDate(date.getUTCDate() + amount);
    return date.toISOString().slice(0, 10);
}
function daysBetween(first, second) {
    return Math.round((Date.parse(second + 'T12:00:00Z') - Date.parse(first + 'T12:00:00Z')) / 86400000);
}
function validTimezone(timezone) {
    try {
        new Intl.DateTimeFormat('en', { timeZone: timezone }).format();
        return true;
    }
    catch {
        return false;
    }
}
function zonedParts(date, timezone) {
    const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
    }).formatToParts(date);
    const get = (type) => parts.find((part) => part.type === type).value;
    return {
        day: `${get('year')}-${get('month')}-${get('day')}`,
        time: `${get('hour')}:${get('minute')}`,
    };
}
function localDay(date = new Date(), timezone = exports.APP_TIMEZONE) {
    return zonedParts(date, timezone).day;
}
function clockMinutes(time) {
    const [hours = 0, minutes = 0] = time.split(':').map(Number);
    return hours * 60 + minutes;
}
function awakeMinutes(plan) {
    return (clockMinutes(plan.sleepTime) - clockMinutes(plan.wakeTime) + 1440) % 1440;
}
function zonedInstant(day, time, timezone) {
    const wanted = Date.parse(`${day}T${time}:00Z`);
    let guess = wanted;
    const offsets = new Set();
    for (let pass = 0; pass < 4; pass++) {
        const parts = zonedParts(new Date(guess), timezone);
        const offset = Date.parse(`${parts.day}T${parts.time}:00Z`) - guess;
        offsets.add(offset);
        guess = wanted - offset;
    }
    for (const change of [-7200000, 7200000]) {
        const candidate = guess + change, parts = zonedParts(new Date(candidate), timezone);
        offsets.add(Date.parse(`${parts.day}T${parts.time}:00Z`) - candidate);
    }
    const matches = [...offsets]
        .map((offset) => wanted - offset)
        .filter((candidate) => {
        const parts = zonedParts(new Date(candidate), timezone);
        return parts.day === day && parts.time === time;
    });
    if (matches.length)
        return new Date(Math.min(...matches));
    let best;
    for (let minute = -120; minute <= 120; minute++) {
        const instant = guess + minute * 60000, parts = zonedParts(new Date(instant), timezone);
        const local = Date.parse(`${parts.day}T${parts.time}:00Z`);
        if (local >= wanted &&
            (!best || local < best.local || (local === best.local && instant < best.instant)))
            best = { instant, local };
    }
    if (!best)
        throw new Error('Unable to resolve this local time.');
    return new Date(best.instant);
}
function waterDay(plan, now = new Date()) {
    const parts = zonedParts(now, exports.APP_TIMEZONE);
    return clockMinutes(plan.sleepTime) < clockMinutes(plan.wakeTime) &&
        clockMinutes(parts.time) < clockMinutes(plan.sleepTime)
        ? addDays(parts.day, -1)
        : parts.day;
}
function waterWindow(plan, day) {
    const endDay = plan.sleepTime <= plan.wakeTime ? addDays(day, 1) : day;
    return {
        start: zonedInstant(day, plan.wakeTime, exports.APP_TIMEZONE),
        end: zonedInstant(endDay, plan.sleepTime, exports.APP_TIMEZONE),
    };
}
function waterSchedule(plan, day, logs = [], states = [], now = new Date()) {
    const count = Math.min(16, Math.max(1, Math.ceil(plan.targetMl / plan.servingMl)));
    const { start, end } = waterWindow(plan, day);
    const daily = logs.filter((log) => log.day === day);
    const taskIds = new Set(Array.from({ length: count }, (_, index) => `${day}:${plan.version}:${index}`));
    let available = daily
        .filter((log) => !log.taskId || !taskIds.has(log.taskId))
        .reduce((sum, log) => sum + log.amountMl, 0);
    return Array.from({ length: count }, (_, index) => {
        const amount = Math.floor((plan.targetMl * (index + 1)) / count) -
            Math.floor((plan.targetMl * index) / count);
        const id = `${day}:${plan.version}:${index}`, state = states.find((item) => item.taskId === id);
        const direct = daily
            .filter((log) => log.taskId === id)
            .reduce((sum, log) => sum + log.amountMl, 0);
        const unfilled = Math.max(0, amount - direct), credited = Math.min(unfilled, available);
        const remainingMl = unfilled - credited;
        available -= credited;
        const at = new Date(Math.floor((start.getTime() + ((end.getTime() - start.getTime()) * (index + 0.5)) / count) / 60000) * 60000).toISOString();
        const due = state?.snoozedUntil ?? at;
        const status = remainingMl === 0
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
function cycleForecast(periods, settings, today) {
    if (!settings?.predictionsEnabled || !periods.length)
        return null;
    const ordered = [...periods]
        .filter((period) => period.startDate <= today)
        .sort((a, b) => a.startDate.localeCompare(b.startDate));
    const last = ordered.at(-1);
    if (!last)
        return null;
    const intervals = ordered
        .slice(1)
        .map((period, index) => daysBetween(ordered[index].startDate, period.startDate))
        .filter((days) => days >= 10 && days <= 120)
        .slice(-6);
    const sorted = [...intervals].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    const length = sorted.length
        ? Math.round(sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2)
        : settings.cycleLength;
    const spread = intervals.length > 1
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
//# sourceMappingURL=domain.js.map