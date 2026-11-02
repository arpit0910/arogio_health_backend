import type { RequestUser } from '../../common/auth/request-user';
import { WellnessService } from './wellness.service';
export declare class WellnessController {
    private readonly service;
    constructor(service: WellnessService);
    activityGoals(u: RequestUser, body: unknown): Promise<{
        activityTracking: import("./domain").ActivityTracking;
        medicines: {
            id: string;
            name: string;
            notes: string;
            enabled: boolean;
            doses: {
                time: string;
                amount: string;
            }[];
        }[];
        waterPlan: {
            timezone: string;
            version: string;
            wakeTime: string;
            sleepTime: string;
            targetMl: number;
            servingMl: number;
            remindersEnabled: boolean;
            pausedUntil: string | null;
        } | null;
        cycleSettings: {
            timezone: string;
            cycleLength: number;
            periodLength: number;
            predictionsEnabled: boolean;
            remindersEnabled: boolean;
            discreet: boolean;
            reminderDaysBefore: number;
            reminderTime: string;
        } | null;
        waterLogs: {
            id: string;
            amountMl: number;
            loggedAt: string;
            day: string;
            targetMl: number;
            taskId: string | null;
        }[];
        waterTasks: {
            taskId: string;
            day: string;
            status: "pending" | "skipped";
            snoozedUntil: string | null;
        }[];
        periods: {
            id: string;
            startDate: string;
            endDate: string | null;
        }[];
        cycleEntries: {
            day: string;
            flow: string;
            symptoms: string[];
            mood: string | null;
            notes: string;
        }[];
    }>;
    activityDay(u: RequestUser, day: string, body: unknown): Promise<{
        activityTracking: import("./domain").ActivityTracking;
        medicines: {
            id: string;
            name: string;
            notes: string;
            enabled: boolean;
            doses: {
                time: string;
                amount: string;
            }[];
        }[];
        waterPlan: {
            timezone: string;
            version: string;
            wakeTime: string;
            sleepTime: string;
            targetMl: number;
            servingMl: number;
            remindersEnabled: boolean;
            pausedUntil: string | null;
        } | null;
        cycleSettings: {
            timezone: string;
            cycleLength: number;
            periodLength: number;
            predictionsEnabled: boolean;
            remindersEnabled: boolean;
            discreet: boolean;
            reminderDaysBefore: number;
            reminderTime: string;
        } | null;
        waterLogs: {
            id: string;
            amountMl: number;
            loggedAt: string;
            day: string;
            targetMl: number;
            taskId: string | null;
        }[];
        waterTasks: {
            taskId: string;
            day: string;
            status: "pending" | "skipped";
            snoozedUntil: string | null;
        }[];
        periods: {
            id: string;
            startDate: string;
            endDate: string | null;
        }[];
        cycleEntries: {
            day: string;
            flow: string;
            symptoms: string[];
            mood: string | null;
            notes: string;
        }[];
    }>;
    clearActivity(u: RequestUser): Promise<{
        activityTracking: import("./domain").ActivityTracking;
        medicines: {
            id: string;
            name: string;
            notes: string;
            enabled: boolean;
            doses: {
                time: string;
                amount: string;
            }[];
        }[];
        waterPlan: {
            timezone: string;
            version: string;
            wakeTime: string;
            sleepTime: string;
            targetMl: number;
            servingMl: number;
            remindersEnabled: boolean;
            pausedUntil: string | null;
        } | null;
        cycleSettings: {
            timezone: string;
            cycleLength: number;
            periodLength: number;
            predictionsEnabled: boolean;
            remindersEnabled: boolean;
            discreet: boolean;
            reminderDaysBefore: number;
            reminderTime: string;
        } | null;
        waterLogs: {
            id: string;
            amountMl: number;
            loggedAt: string;
            day: string;
            targetMl: number;
            taskId: string | null;
        }[];
        waterTasks: {
            taskId: string;
            day: string;
            status: "pending" | "skipped";
            snoozedUntil: string | null;
        }[];
        periods: {
            id: string;
            startDate: string;
            endDate: string | null;
        }[];
        cycleEntries: {
            day: string;
            flow: string;
            symptoms: string[];
            mood: string | null;
            notes: string;
        }[];
    }>;
    medicine(u: RequestUser, id: string, body: unknown): Promise<{
        activityTracking: import("./domain").ActivityTracking;
        medicines: {
            id: string;
            name: string;
            notes: string;
            enabled: boolean;
            doses: {
                time: string;
                amount: string;
            }[];
        }[];
        waterPlan: {
            timezone: string;
            version: string;
            wakeTime: string;
            sleepTime: string;
            targetMl: number;
            servingMl: number;
            remindersEnabled: boolean;
            pausedUntil: string | null;
        } | null;
        cycleSettings: {
            timezone: string;
            cycleLength: number;
            periodLength: number;
            predictionsEnabled: boolean;
            remindersEnabled: boolean;
            discreet: boolean;
            reminderDaysBefore: number;
            reminderTime: string;
        } | null;
        waterLogs: {
            id: string;
            amountMl: number;
            loggedAt: string;
            day: string;
            targetMl: number;
            taskId: string | null;
        }[];
        waterTasks: {
            taskId: string;
            day: string;
            status: "pending" | "skipped";
            snoozedUntil: string | null;
        }[];
        periods: {
            id: string;
            startDate: string;
            endDate: string | null;
        }[];
        cycleEntries: {
            day: string;
            flow: string;
            symptoms: string[];
            mood: string | null;
            notes: string;
        }[];
    }>;
    removeMedicine(u: RequestUser, id: string): Promise<{
        activityTracking: import("./domain").ActivityTracking;
        medicines: {
            id: string;
            name: string;
            notes: string;
            enabled: boolean;
            doses: {
                time: string;
                amount: string;
            }[];
        }[];
        waterPlan: {
            timezone: string;
            version: string;
            wakeTime: string;
            sleepTime: string;
            targetMl: number;
            servingMl: number;
            remindersEnabled: boolean;
            pausedUntil: string | null;
        } | null;
        cycleSettings: {
            timezone: string;
            cycleLength: number;
            periodLength: number;
            predictionsEnabled: boolean;
            remindersEnabled: boolean;
            discreet: boolean;
            reminderDaysBefore: number;
            reminderTime: string;
        } | null;
        waterLogs: {
            id: string;
            amountMl: number;
            loggedAt: string;
            day: string;
            targetMl: number;
            taskId: string | null;
        }[];
        waterTasks: {
            taskId: string;
            day: string;
            status: "pending" | "skipped";
            snoozedUntil: string | null;
        }[];
        periods: {
            id: string;
            startDate: string;
            endDate: string | null;
        }[];
        cycleEntries: {
            day: string;
            flow: string;
            symptoms: string[];
            mood: string | null;
            notes: string;
        }[];
    }>;
    get(u: RequestUser): Promise<{
        activityTracking: import("./domain").ActivityTracking;
        medicines: {
            id: string;
            name: string;
            notes: string;
            enabled: boolean;
            doses: {
                time: string;
                amount: string;
            }[];
        }[];
        waterPlan: {
            timezone: string;
            version: string;
            wakeTime: string;
            sleepTime: string;
            targetMl: number;
            servingMl: number;
            remindersEnabled: boolean;
            pausedUntil: string | null;
        } | null;
        cycleSettings: {
            timezone: string;
            cycleLength: number;
            periodLength: number;
            predictionsEnabled: boolean;
            remindersEnabled: boolean;
            discreet: boolean;
            reminderDaysBefore: number;
            reminderTime: string;
        } | null;
        waterLogs: {
            id: string;
            amountMl: number;
            loggedAt: string;
            day: string;
            targetMl: number;
            taskId: string | null;
        }[];
        waterTasks: {
            taskId: string;
            day: string;
            status: "pending" | "skipped";
            snoozedUntil: string | null;
        }[];
        periods: {
            id: string;
            startDate: string;
            endDate: string | null;
        }[];
        cycleEntries: {
            day: string;
            flow: string;
            symptoms: string[];
            mood: string | null;
            notes: string;
        }[];
    }>;
    plan(u: RequestUser, body: unknown): Promise<{
        activityTracking: import("./domain").ActivityTracking;
        medicines: {
            id: string;
            name: string;
            notes: string;
            enabled: boolean;
            doses: {
                time: string;
                amount: string;
            }[];
        }[];
        waterPlan: {
            timezone: string;
            version: string;
            wakeTime: string;
            sleepTime: string;
            targetMl: number;
            servingMl: number;
            remindersEnabled: boolean;
            pausedUntil: string | null;
        } | null;
        cycleSettings: {
            timezone: string;
            cycleLength: number;
            periodLength: number;
            predictionsEnabled: boolean;
            remindersEnabled: boolean;
            discreet: boolean;
            reminderDaysBefore: number;
            reminderTime: string;
        } | null;
        waterLogs: {
            id: string;
            amountMl: number;
            loggedAt: string;
            day: string;
            targetMl: number;
            taskId: string | null;
        }[];
        waterTasks: {
            taskId: string;
            day: string;
            status: "pending" | "skipped";
            snoozedUntil: string | null;
        }[];
        periods: {
            id: string;
            startDate: string;
            endDate: string | null;
        }[];
        cycleEntries: {
            day: string;
            flow: string;
            symptoms: string[];
            mood: string | null;
            notes: string;
        }[];
    }>;
    log(u: RequestUser, id: string, body: unknown): Promise<{
        activityTracking: import("./domain").ActivityTracking;
        medicines: {
            id: string;
            name: string;
            notes: string;
            enabled: boolean;
            doses: {
                time: string;
                amount: string;
            }[];
        }[];
        waterPlan: {
            timezone: string;
            version: string;
            wakeTime: string;
            sleepTime: string;
            targetMl: number;
            servingMl: number;
            remindersEnabled: boolean;
            pausedUntil: string | null;
        } | null;
        cycleSettings: {
            timezone: string;
            cycleLength: number;
            periodLength: number;
            predictionsEnabled: boolean;
            remindersEnabled: boolean;
            discreet: boolean;
            reminderDaysBefore: number;
            reminderTime: string;
        } | null;
        waterLogs: {
            id: string;
            amountMl: number;
            loggedAt: string;
            day: string;
            targetMl: number;
            taskId: string | null;
        }[];
        waterTasks: {
            taskId: string;
            day: string;
            status: "pending" | "skipped";
            snoozedUntil: string | null;
        }[];
        periods: {
            id: string;
            startDate: string;
            endDate: string | null;
        }[];
        cycleEntries: {
            day: string;
            flow: string;
            symptoms: string[];
            mood: string | null;
            notes: string;
        }[];
    }>;
    removeLog(u: RequestUser, id: string): Promise<{
        activityTracking: import("./domain").ActivityTracking;
        medicines: {
            id: string;
            name: string;
            notes: string;
            enabled: boolean;
            doses: {
                time: string;
                amount: string;
            }[];
        }[];
        waterPlan: {
            timezone: string;
            version: string;
            wakeTime: string;
            sleepTime: string;
            targetMl: number;
            servingMl: number;
            remindersEnabled: boolean;
            pausedUntil: string | null;
        } | null;
        cycleSettings: {
            timezone: string;
            cycleLength: number;
            periodLength: number;
            predictionsEnabled: boolean;
            remindersEnabled: boolean;
            discreet: boolean;
            reminderDaysBefore: number;
            reminderTime: string;
        } | null;
        waterLogs: {
            id: string;
            amountMl: number;
            loggedAt: string;
            day: string;
            targetMl: number;
            taskId: string | null;
        }[];
        waterTasks: {
            taskId: string;
            day: string;
            status: "pending" | "skipped";
            snoozedUntil: string | null;
        }[];
        periods: {
            id: string;
            startDate: string;
            endDate: string | null;
        }[];
        cycleEntries: {
            day: string;
            flow: string;
            symptoms: string[];
            mood: string | null;
            notes: string;
        }[];
    }>;
    task(u: RequestUser, id: string, body: unknown): Promise<{
        activityTracking: import("./domain").ActivityTracking;
        medicines: {
            id: string;
            name: string;
            notes: string;
            enabled: boolean;
            doses: {
                time: string;
                amount: string;
            }[];
        }[];
        waterPlan: {
            timezone: string;
            version: string;
            wakeTime: string;
            sleepTime: string;
            targetMl: number;
            servingMl: number;
            remindersEnabled: boolean;
            pausedUntil: string | null;
        } | null;
        cycleSettings: {
            timezone: string;
            cycleLength: number;
            periodLength: number;
            predictionsEnabled: boolean;
            remindersEnabled: boolean;
            discreet: boolean;
            reminderDaysBefore: number;
            reminderTime: string;
        } | null;
        waterLogs: {
            id: string;
            amountMl: number;
            loggedAt: string;
            day: string;
            targetMl: number;
            taskId: string | null;
        }[];
        waterTasks: {
            taskId: string;
            day: string;
            status: "pending" | "skipped";
            snoozedUntil: string | null;
        }[];
        periods: {
            id: string;
            startDate: string;
            endDate: string | null;
        }[];
        cycleEntries: {
            day: string;
            flow: string;
            symptoms: string[];
            mood: string | null;
            notes: string;
        }[];
    }>;
    clearWater(u: RequestUser): Promise<{
        activityTracking: import("./domain").ActivityTracking;
        medicines: {
            id: string;
            name: string;
            notes: string;
            enabled: boolean;
            doses: {
                time: string;
                amount: string;
            }[];
        }[];
        waterPlan: {
            timezone: string;
            version: string;
            wakeTime: string;
            sleepTime: string;
            targetMl: number;
            servingMl: number;
            remindersEnabled: boolean;
            pausedUntil: string | null;
        } | null;
        cycleSettings: {
            timezone: string;
            cycleLength: number;
            periodLength: number;
            predictionsEnabled: boolean;
            remindersEnabled: boolean;
            discreet: boolean;
            reminderDaysBefore: number;
            reminderTime: string;
        } | null;
        waterLogs: {
            id: string;
            amountMl: number;
            loggedAt: string;
            day: string;
            targetMl: number;
            taskId: string | null;
        }[];
        waterTasks: {
            taskId: string;
            day: string;
            status: "pending" | "skipped";
            snoozedUntil: string | null;
        }[];
        periods: {
            id: string;
            startDate: string;
            endDate: string | null;
        }[];
        cycleEntries: {
            day: string;
            flow: string;
            symptoms: string[];
            mood: string | null;
            notes: string;
        }[];
    }>;
    cycle(u: RequestUser, body: unknown): Promise<{
        activityTracking: import("./domain").ActivityTracking;
        medicines: {
            id: string;
            name: string;
            notes: string;
            enabled: boolean;
            doses: {
                time: string;
                amount: string;
            }[];
        }[];
        waterPlan: {
            timezone: string;
            version: string;
            wakeTime: string;
            sleepTime: string;
            targetMl: number;
            servingMl: number;
            remindersEnabled: boolean;
            pausedUntil: string | null;
        } | null;
        cycleSettings: {
            timezone: string;
            cycleLength: number;
            periodLength: number;
            predictionsEnabled: boolean;
            remindersEnabled: boolean;
            discreet: boolean;
            reminderDaysBefore: number;
            reminderTime: string;
        } | null;
        waterLogs: {
            id: string;
            amountMl: number;
            loggedAt: string;
            day: string;
            targetMl: number;
            taskId: string | null;
        }[];
        waterTasks: {
            taskId: string;
            day: string;
            status: "pending" | "skipped";
            snoozedUntil: string | null;
        }[];
        periods: {
            id: string;
            startDate: string;
            endDate: string | null;
        }[];
        cycleEntries: {
            day: string;
            flow: string;
            symptoms: string[];
            mood: string | null;
            notes: string;
        }[];
    }>;
    period(u: RequestUser, id: string, body: unknown): Promise<{
        activityTracking: import("./domain").ActivityTracking;
        medicines: {
            id: string;
            name: string;
            notes: string;
            enabled: boolean;
            doses: {
                time: string;
                amount: string;
            }[];
        }[];
        waterPlan: {
            timezone: string;
            version: string;
            wakeTime: string;
            sleepTime: string;
            targetMl: number;
            servingMl: number;
            remindersEnabled: boolean;
            pausedUntil: string | null;
        } | null;
        cycleSettings: {
            timezone: string;
            cycleLength: number;
            periodLength: number;
            predictionsEnabled: boolean;
            remindersEnabled: boolean;
            discreet: boolean;
            reminderDaysBefore: number;
            reminderTime: string;
        } | null;
        waterLogs: {
            id: string;
            amountMl: number;
            loggedAt: string;
            day: string;
            targetMl: number;
            taskId: string | null;
        }[];
        waterTasks: {
            taskId: string;
            day: string;
            status: "pending" | "skipped";
            snoozedUntil: string | null;
        }[];
        periods: {
            id: string;
            startDate: string;
            endDate: string | null;
        }[];
        cycleEntries: {
            day: string;
            flow: string;
            symptoms: string[];
            mood: string | null;
            notes: string;
        }[];
    }>;
    removePeriod(u: RequestUser, id: string): Promise<{
        activityTracking: import("./domain").ActivityTracking;
        medicines: {
            id: string;
            name: string;
            notes: string;
            enabled: boolean;
            doses: {
                time: string;
                amount: string;
            }[];
        }[];
        waterPlan: {
            timezone: string;
            version: string;
            wakeTime: string;
            sleepTime: string;
            targetMl: number;
            servingMl: number;
            remindersEnabled: boolean;
            pausedUntil: string | null;
        } | null;
        cycleSettings: {
            timezone: string;
            cycleLength: number;
            periodLength: number;
            predictionsEnabled: boolean;
            remindersEnabled: boolean;
            discreet: boolean;
            reminderDaysBefore: number;
            reminderTime: string;
        } | null;
        waterLogs: {
            id: string;
            amountMl: number;
            loggedAt: string;
            day: string;
            targetMl: number;
            taskId: string | null;
        }[];
        waterTasks: {
            taskId: string;
            day: string;
            status: "pending" | "skipped";
            snoozedUntil: string | null;
        }[];
        periods: {
            id: string;
            startDate: string;
            endDate: string | null;
        }[];
        cycleEntries: {
            day: string;
            flow: string;
            symptoms: string[];
            mood: string | null;
            notes: string;
        }[];
    }>;
    entry(u: RequestUser, day: string, body: unknown): Promise<{
        activityTracking: import("./domain").ActivityTracking;
        medicines: {
            id: string;
            name: string;
            notes: string;
            enabled: boolean;
            doses: {
                time: string;
                amount: string;
            }[];
        }[];
        waterPlan: {
            timezone: string;
            version: string;
            wakeTime: string;
            sleepTime: string;
            targetMl: number;
            servingMl: number;
            remindersEnabled: boolean;
            pausedUntil: string | null;
        } | null;
        cycleSettings: {
            timezone: string;
            cycleLength: number;
            periodLength: number;
            predictionsEnabled: boolean;
            remindersEnabled: boolean;
            discreet: boolean;
            reminderDaysBefore: number;
            reminderTime: string;
        } | null;
        waterLogs: {
            id: string;
            amountMl: number;
            loggedAt: string;
            day: string;
            targetMl: number;
            taskId: string | null;
        }[];
        waterTasks: {
            taskId: string;
            day: string;
            status: "pending" | "skipped";
            snoozedUntil: string | null;
        }[];
        periods: {
            id: string;
            startDate: string;
            endDate: string | null;
        }[];
        cycleEntries: {
            day: string;
            flow: string;
            symptoms: string[];
            mood: string | null;
            notes: string;
        }[];
    }>;
    removeEntry(u: RequestUser, day: string): Promise<{
        activityTracking: import("./domain").ActivityTracking;
        medicines: {
            id: string;
            name: string;
            notes: string;
            enabled: boolean;
            doses: {
                time: string;
                amount: string;
            }[];
        }[];
        waterPlan: {
            timezone: string;
            version: string;
            wakeTime: string;
            sleepTime: string;
            targetMl: number;
            servingMl: number;
            remindersEnabled: boolean;
            pausedUntil: string | null;
        } | null;
        cycleSettings: {
            timezone: string;
            cycleLength: number;
            periodLength: number;
            predictionsEnabled: boolean;
            remindersEnabled: boolean;
            discreet: boolean;
            reminderDaysBefore: number;
            reminderTime: string;
        } | null;
        waterLogs: {
            id: string;
            amountMl: number;
            loggedAt: string;
            day: string;
            targetMl: number;
            taskId: string | null;
        }[];
        waterTasks: {
            taskId: string;
            day: string;
            status: "pending" | "skipped";
            snoozedUntil: string | null;
        }[];
        periods: {
            id: string;
            startDate: string;
            endDate: string | null;
        }[];
        cycleEntries: {
            day: string;
            flow: string;
            symptoms: string[];
            mood: string | null;
            notes: string;
        }[];
    }>;
    clearCycle(u: RequestUser): Promise<{
        activityTracking: import("./domain").ActivityTracking;
        medicines: {
            id: string;
            name: string;
            notes: string;
            enabled: boolean;
            doses: {
                time: string;
                amount: string;
            }[];
        }[];
        waterPlan: {
            timezone: string;
            version: string;
            wakeTime: string;
            sleepTime: string;
            targetMl: number;
            servingMl: number;
            remindersEnabled: boolean;
            pausedUntil: string | null;
        } | null;
        cycleSettings: {
            timezone: string;
            cycleLength: number;
            periodLength: number;
            predictionsEnabled: boolean;
            remindersEnabled: boolean;
            discreet: boolean;
            reminderDaysBefore: number;
            reminderTime: string;
        } | null;
        waterLogs: {
            id: string;
            amountMl: number;
            loggedAt: string;
            day: string;
            targetMl: number;
            taskId: string | null;
        }[];
        waterTasks: {
            taskId: string;
            day: string;
            status: "pending" | "skipped";
            snoozedUntil: string | null;
        }[];
        periods: {
            id: string;
            startDate: string;
            endDate: string | null;
        }[];
        cycleEntries: {
            day: string;
            flow: string;
            symptoms: string[];
            mood: string | null;
            notes: string;
        }[];
    }>;
}
