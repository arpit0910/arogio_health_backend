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
export type Period = {
    id: string;
    startDate: string;
    endDate: string | null;
};
export declare const symptoms: readonly ["cramps", "bloating", "headache", "fatigue", "back_pain", "breast_tenderness", "acne", "nausea"];
export declare const moods: readonly ["calm", "happy", "low", "irritable", "anxious"];
export declare const flows: readonly ["none", "spotting", "light", "medium", "heavy"];
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
export declare const emptyWellness: () => WellnessData;
export declare const defaultCycleSettings: (timezone: string) => CycleSettings;
export declare function validDay(day: string): boolean;
export declare function addDays(day: string, amount: number): string;
export declare function daysBetween(first: string, second: string): number;
export declare function validTimezone(timezone: string): boolean;
export declare function localDay(date?: Date, timezone?: string): string;
export declare function clockMinutes(time: string): number;
export declare function awakeMinutes(plan: Pick<WaterPlan, 'wakeTime' | 'sleepTime'>): number;
export declare function zonedInstant(day: string, time: string, timezone: string): Date;
export declare function waterDay(plan: WaterPlan, now?: Date): string;
export declare function waterWindow(plan: WaterPlan, day: string): {
    start: Date;
    end: Date;
};
export declare function waterSchedule(plan: WaterPlan, day: string, logs?: WaterLog[], states?: WaterTaskState[], now?: Date): WaterTask[];
export declare function cycleForecast(periods: Period[], settings: CycleSettings | null, today: string): {
    expected: string;
    earliest: string;
    latest: string;
    length: number;
    intervals: number;
    variable: boolean;
    overdue: boolean;
    cycleDay: number;
} | null;
