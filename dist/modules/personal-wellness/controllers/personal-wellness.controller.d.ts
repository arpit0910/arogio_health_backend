import type { RequestUser } from '../../../common/authentication/request-user';
import { PersonalWellnessService } from '../services/personal-wellness.service';
export declare class PersonalWellnessController {
    private readonly service;
    constructor(service: PersonalWellnessService);
    activityGoals(u: RequestUser, body: unknown): Promise<{
        activityTracking: import("../domain/personal-wellness.domain").ActivityTracking;
        medicines: {
            id: string;
            name: string;
            notes: string;
            enabled: boolean;
            form?: string;
            strength?: string;
            unit?: string;
            alertType?: "default" | "gentle" | "vibrate";
            recurrence?: "daily" | "weekly" | "cycle" | "sos";
            weekdays?: number[];
            startDate?: string;
            endDate?: string | null;
            cycleOnDays?: number;
            cycleOffDays?: number;
            stock?: number | null;
            lowStockThreshold?: number;
            stockDebits?: Record<string, number>;
            doses: {
                time: string;
                amount: string;
                meal?: "any" | "before" | "after";
            }[];
        }[];
        medicineDoses: {
            medicineId: string;
            day: string;
            time: string;
            status: "pending" | "taken" | "skipped";
            recordedAt: string;
            snoozedUntil: string | null;
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
        activityTracking: import("../domain/personal-wellness.domain").ActivityTracking;
        medicines: {
            id: string;
            name: string;
            notes: string;
            enabled: boolean;
            form?: string;
            strength?: string;
            unit?: string;
            alertType?: "default" | "gentle" | "vibrate";
            recurrence?: "daily" | "weekly" | "cycle" | "sos";
            weekdays?: number[];
            startDate?: string;
            endDate?: string | null;
            cycleOnDays?: number;
            cycleOffDays?: number;
            stock?: number | null;
            lowStockThreshold?: number;
            stockDebits?: Record<string, number>;
            doses: {
                time: string;
                amount: string;
                meal?: "any" | "before" | "after";
            }[];
        }[];
        medicineDoses: {
            medicineId: string;
            day: string;
            time: string;
            status: "pending" | "taken" | "skipped";
            recordedAt: string;
            snoozedUntil: string | null;
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
        activityTracking: import("../domain/personal-wellness.domain").ActivityTracking;
        medicines: {
            id: string;
            name: string;
            notes: string;
            enabled: boolean;
            form?: string;
            strength?: string;
            unit?: string;
            alertType?: "default" | "gentle" | "vibrate";
            recurrence?: "daily" | "weekly" | "cycle" | "sos";
            weekdays?: number[];
            startDate?: string;
            endDate?: string | null;
            cycleOnDays?: number;
            cycleOffDays?: number;
            stock?: number | null;
            lowStockThreshold?: number;
            stockDebits?: Record<string, number>;
            doses: {
                time: string;
                amount: string;
                meal?: "any" | "before" | "after";
            }[];
        }[];
        medicineDoses: {
            medicineId: string;
            day: string;
            time: string;
            status: "pending" | "taken" | "skipped";
            recordedAt: string;
            snoozedUntil: string | null;
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
        activityTracking: import("../domain/personal-wellness.domain").ActivityTracking;
        medicines: {
            id: string;
            name: string;
            notes: string;
            enabled: boolean;
            form?: string;
            strength?: string;
            unit?: string;
            alertType?: "default" | "gentle" | "vibrate";
            recurrence?: "daily" | "weekly" | "cycle" | "sos";
            weekdays?: number[];
            startDate?: string;
            endDate?: string | null;
            cycleOnDays?: number;
            cycleOffDays?: number;
            stock?: number | null;
            lowStockThreshold?: number;
            stockDebits?: Record<string, number>;
            doses: {
                time: string;
                amount: string;
                meal?: "any" | "before" | "after";
            }[];
        }[];
        medicineDoses: {
            medicineId: string;
            day: string;
            time: string;
            status: "pending" | "taken" | "skipped";
            recordedAt: string;
            snoozedUntil: string | null;
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
        activityTracking: import("../domain/personal-wellness.domain").ActivityTracking;
        medicines: {
            id: string;
            name: string;
            notes: string;
            enabled: boolean;
            form?: string;
            strength?: string;
            unit?: string;
            alertType?: "default" | "gentle" | "vibrate";
            recurrence?: "daily" | "weekly" | "cycle" | "sos";
            weekdays?: number[];
            startDate?: string;
            endDate?: string | null;
            cycleOnDays?: number;
            cycleOffDays?: number;
            stock?: number | null;
            lowStockThreshold?: number;
            stockDebits?: Record<string, number>;
            doses: {
                time: string;
                amount: string;
                meal?: "any" | "before" | "after";
            }[];
        }[];
        medicineDoses: {
            medicineId: string;
            day: string;
            time: string;
            status: "pending" | "taken" | "skipped";
            recordedAt: string;
            snoozedUntil: string | null;
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
    dose(u: RequestUser, id: string, day: string, time: string, body: unknown): Promise<{
        activityTracking: import("../domain/personal-wellness.domain").ActivityTracking;
        medicines: {
            id: string;
            name: string;
            notes: string;
            enabled: boolean;
            form?: string;
            strength?: string;
            unit?: string;
            alertType?: "default" | "gentle" | "vibrate";
            recurrence?: "daily" | "weekly" | "cycle" | "sos";
            weekdays?: number[];
            startDate?: string;
            endDate?: string | null;
            cycleOnDays?: number;
            cycleOffDays?: number;
            stock?: number | null;
            lowStockThreshold?: number;
            stockDebits?: Record<string, number>;
            doses: {
                time: string;
                amount: string;
                meal?: "any" | "before" | "after";
            }[];
        }[];
        medicineDoses: {
            medicineId: string;
            day: string;
            time: string;
            status: "pending" | "taken" | "skipped";
            recordedAt: string;
            snoozedUntil: string | null;
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
        activityTracking: import("../domain/personal-wellness.domain").ActivityTracking;
        medicines: {
            id: string;
            name: string;
            notes: string;
            enabled: boolean;
            form?: string;
            strength?: string;
            unit?: string;
            alertType?: "default" | "gentle" | "vibrate";
            recurrence?: "daily" | "weekly" | "cycle" | "sos";
            weekdays?: number[];
            startDate?: string;
            endDate?: string | null;
            cycleOnDays?: number;
            cycleOffDays?: number;
            stock?: number | null;
            lowStockThreshold?: number;
            stockDebits?: Record<string, number>;
            doses: {
                time: string;
                amount: string;
                meal?: "any" | "before" | "after";
            }[];
        }[];
        medicineDoses: {
            medicineId: string;
            day: string;
            time: string;
            status: "pending" | "taken" | "skipped";
            recordedAt: string;
            snoozedUntil: string | null;
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
        activityTracking: import("../domain/personal-wellness.domain").ActivityTracking;
        medicines: {
            id: string;
            name: string;
            notes: string;
            enabled: boolean;
            form?: string;
            strength?: string;
            unit?: string;
            alertType?: "default" | "gentle" | "vibrate";
            recurrence?: "daily" | "weekly" | "cycle" | "sos";
            weekdays?: number[];
            startDate?: string;
            endDate?: string | null;
            cycleOnDays?: number;
            cycleOffDays?: number;
            stock?: number | null;
            lowStockThreshold?: number;
            stockDebits?: Record<string, number>;
            doses: {
                time: string;
                amount: string;
                meal?: "any" | "before" | "after";
            }[];
        }[];
        medicineDoses: {
            medicineId: string;
            day: string;
            time: string;
            status: "pending" | "taken" | "skipped";
            recordedAt: string;
            snoozedUntil: string | null;
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
        activityTracking: import("../domain/personal-wellness.domain").ActivityTracking;
        medicines: {
            id: string;
            name: string;
            notes: string;
            enabled: boolean;
            form?: string;
            strength?: string;
            unit?: string;
            alertType?: "default" | "gentle" | "vibrate";
            recurrence?: "daily" | "weekly" | "cycle" | "sos";
            weekdays?: number[];
            startDate?: string;
            endDate?: string | null;
            cycleOnDays?: number;
            cycleOffDays?: number;
            stock?: number | null;
            lowStockThreshold?: number;
            stockDebits?: Record<string, number>;
            doses: {
                time: string;
                amount: string;
                meal?: "any" | "before" | "after";
            }[];
        }[];
        medicineDoses: {
            medicineId: string;
            day: string;
            time: string;
            status: "pending" | "taken" | "skipped";
            recordedAt: string;
            snoozedUntil: string | null;
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
        activityTracking: import("../domain/personal-wellness.domain").ActivityTracking;
        medicines: {
            id: string;
            name: string;
            notes: string;
            enabled: boolean;
            form?: string;
            strength?: string;
            unit?: string;
            alertType?: "default" | "gentle" | "vibrate";
            recurrence?: "daily" | "weekly" | "cycle" | "sos";
            weekdays?: number[];
            startDate?: string;
            endDate?: string | null;
            cycleOnDays?: number;
            cycleOffDays?: number;
            stock?: number | null;
            lowStockThreshold?: number;
            stockDebits?: Record<string, number>;
            doses: {
                time: string;
                amount: string;
                meal?: "any" | "before" | "after";
            }[];
        }[];
        medicineDoses: {
            medicineId: string;
            day: string;
            time: string;
            status: "pending" | "taken" | "skipped";
            recordedAt: string;
            snoozedUntil: string | null;
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
        activityTracking: import("../domain/personal-wellness.domain").ActivityTracking;
        medicines: {
            id: string;
            name: string;
            notes: string;
            enabled: boolean;
            form?: string;
            strength?: string;
            unit?: string;
            alertType?: "default" | "gentle" | "vibrate";
            recurrence?: "daily" | "weekly" | "cycle" | "sos";
            weekdays?: number[];
            startDate?: string;
            endDate?: string | null;
            cycleOnDays?: number;
            cycleOffDays?: number;
            stock?: number | null;
            lowStockThreshold?: number;
            stockDebits?: Record<string, number>;
            doses: {
                time: string;
                amount: string;
                meal?: "any" | "before" | "after";
            }[];
        }[];
        medicineDoses: {
            medicineId: string;
            day: string;
            time: string;
            status: "pending" | "taken" | "skipped";
            recordedAt: string;
            snoozedUntil: string | null;
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
        activityTracking: import("../domain/personal-wellness.domain").ActivityTracking;
        medicines: {
            id: string;
            name: string;
            notes: string;
            enabled: boolean;
            form?: string;
            strength?: string;
            unit?: string;
            alertType?: "default" | "gentle" | "vibrate";
            recurrence?: "daily" | "weekly" | "cycle" | "sos";
            weekdays?: number[];
            startDate?: string;
            endDate?: string | null;
            cycleOnDays?: number;
            cycleOffDays?: number;
            stock?: number | null;
            lowStockThreshold?: number;
            stockDebits?: Record<string, number>;
            doses: {
                time: string;
                amount: string;
                meal?: "any" | "before" | "after";
            }[];
        }[];
        medicineDoses: {
            medicineId: string;
            day: string;
            time: string;
            status: "pending" | "taken" | "skipped";
            recordedAt: string;
            snoozedUntil: string | null;
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
        activityTracking: import("../domain/personal-wellness.domain").ActivityTracking;
        medicines: {
            id: string;
            name: string;
            notes: string;
            enabled: boolean;
            form?: string;
            strength?: string;
            unit?: string;
            alertType?: "default" | "gentle" | "vibrate";
            recurrence?: "daily" | "weekly" | "cycle" | "sos";
            weekdays?: number[];
            startDate?: string;
            endDate?: string | null;
            cycleOnDays?: number;
            cycleOffDays?: number;
            stock?: number | null;
            lowStockThreshold?: number;
            stockDebits?: Record<string, number>;
            doses: {
                time: string;
                amount: string;
                meal?: "any" | "before" | "after";
            }[];
        }[];
        medicineDoses: {
            medicineId: string;
            day: string;
            time: string;
            status: "pending" | "taken" | "skipped";
            recordedAt: string;
            snoozedUntil: string | null;
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
        activityTracking: import("../domain/personal-wellness.domain").ActivityTracking;
        medicines: {
            id: string;
            name: string;
            notes: string;
            enabled: boolean;
            form?: string;
            strength?: string;
            unit?: string;
            alertType?: "default" | "gentle" | "vibrate";
            recurrence?: "daily" | "weekly" | "cycle" | "sos";
            weekdays?: number[];
            startDate?: string;
            endDate?: string | null;
            cycleOnDays?: number;
            cycleOffDays?: number;
            stock?: number | null;
            lowStockThreshold?: number;
            stockDebits?: Record<string, number>;
            doses: {
                time: string;
                amount: string;
                meal?: "any" | "before" | "after";
            }[];
        }[];
        medicineDoses: {
            medicineId: string;
            day: string;
            time: string;
            status: "pending" | "taken" | "skipped";
            recordedAt: string;
            snoozedUntil: string | null;
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
        activityTracking: import("../domain/personal-wellness.domain").ActivityTracking;
        medicines: {
            id: string;
            name: string;
            notes: string;
            enabled: boolean;
            form?: string;
            strength?: string;
            unit?: string;
            alertType?: "default" | "gentle" | "vibrate";
            recurrence?: "daily" | "weekly" | "cycle" | "sos";
            weekdays?: number[];
            startDate?: string;
            endDate?: string | null;
            cycleOnDays?: number;
            cycleOffDays?: number;
            stock?: number | null;
            lowStockThreshold?: number;
            stockDebits?: Record<string, number>;
            doses: {
                time: string;
                amount: string;
                meal?: "any" | "before" | "after";
            }[];
        }[];
        medicineDoses: {
            medicineId: string;
            day: string;
            time: string;
            status: "pending" | "taken" | "skipped";
            recordedAt: string;
            snoozedUntil: string | null;
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
        activityTracking: import("../domain/personal-wellness.domain").ActivityTracking;
        medicines: {
            id: string;
            name: string;
            notes: string;
            enabled: boolean;
            form?: string;
            strength?: string;
            unit?: string;
            alertType?: "default" | "gentle" | "vibrate";
            recurrence?: "daily" | "weekly" | "cycle" | "sos";
            weekdays?: number[];
            startDate?: string;
            endDate?: string | null;
            cycleOnDays?: number;
            cycleOffDays?: number;
            stock?: number | null;
            lowStockThreshold?: number;
            stockDebits?: Record<string, number>;
            doses: {
                time: string;
                amount: string;
                meal?: "any" | "before" | "after";
            }[];
        }[];
        medicineDoses: {
            medicineId: string;
            day: string;
            time: string;
            status: "pending" | "taken" | "skipped";
            recordedAt: string;
            snoozedUntil: string | null;
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
        activityTracking: import("../domain/personal-wellness.domain").ActivityTracking;
        medicines: {
            id: string;
            name: string;
            notes: string;
            enabled: boolean;
            form?: string;
            strength?: string;
            unit?: string;
            alertType?: "default" | "gentle" | "vibrate";
            recurrence?: "daily" | "weekly" | "cycle" | "sos";
            weekdays?: number[];
            startDate?: string;
            endDate?: string | null;
            cycleOnDays?: number;
            cycleOffDays?: number;
            stock?: number | null;
            lowStockThreshold?: number;
            stockDebits?: Record<string, number>;
            doses: {
                time: string;
                amount: string;
                meal?: "any" | "before" | "after";
            }[];
        }[];
        medicineDoses: {
            medicineId: string;
            day: string;
            time: string;
            status: "pending" | "taken" | "skipped";
            recordedAt: string;
            snoozedUntil: string | null;
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
        activityTracking: import("../domain/personal-wellness.domain").ActivityTracking;
        medicines: {
            id: string;
            name: string;
            notes: string;
            enabled: boolean;
            form?: string;
            strength?: string;
            unit?: string;
            alertType?: "default" | "gentle" | "vibrate";
            recurrence?: "daily" | "weekly" | "cycle" | "sos";
            weekdays?: number[];
            startDate?: string;
            endDate?: string | null;
            cycleOnDays?: number;
            cycleOffDays?: number;
            stock?: number | null;
            lowStockThreshold?: number;
            stockDebits?: Record<string, number>;
            doses: {
                time: string;
                amount: string;
                meal?: "any" | "before" | "after";
            }[];
        }[];
        medicineDoses: {
            medicineId: string;
            day: string;
            time: string;
            status: "pending" | "taken" | "skipped";
            recordedAt: string;
            snoozedUntil: string | null;
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
