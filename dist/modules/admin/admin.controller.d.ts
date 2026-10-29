import type { Response } from 'express';
import type { RequestUser } from '../../common/auth/request-user';
import { AdminService } from './admin.service';
export declare class AdminController {
    private readonly service;
    constructor(service: AdminService);
    me(u: RequestUser): {
        id: string;
        role: string;
    };
    analytics(): Promise<{
        accounts: {
            total: number;
            active: number;
            deleted: number;
            completed: number;
            referred: number;
            new7: number;
            new30: number;
        } | undefined;
        tracking: {
            water: {
                records: number;
                totalMl: number;
            } | undefined;
            cycleEntries: number;
            configuredAccounts: number;
        };
        recent: {
            id: string;
            fullName: string | null;
            email: string | null;
            createdAt: Date;
        }[];
        growth: {
            day: string;
            accounts: number;
        }[];
        referrals: {
            id: string;
            fullName: string | null;
            email: string | null;
            referralCode: string;
            invitations: number;
        }[];
    }>;
    users(query: unknown): Promise<{
        rows: {
            deletionRequestedAt: Date | null;
            recoverableUntil: Date | null;
            role: "user" | "super_admin";
            referralCode: string;
            hasReferrer: boolean;
            profileSetup: Record<string, unknown> | null;
            profileCompletedAt: Date | null;
            id: string;
            fullName: string | null;
            username: string | null;
            email: string | null;
            mobileNumber: string | null;
            heightValue: number | null;
            heightUnit: "cm" | "in" | null;
            weightValue: number | null;
            weightUnit: "kg" | "lb" | null;
            bmi: number | null;
            status: "active" | "disabled" | "pending";
            createdAt: Date;
            updatedAt: Date;
        }[];
        total: number;
        page: number;
    }>;
    create(u: RequestUser, body: unknown): Promise<import("../auth/dto/auth-response.dto").SafeUserDto>;
    user(u: RequestUser, id: string): Promise<{
        deletionRequestedAt: Date | null;
        recoverableUntil: Date | null;
        referredByUserId: string | null;
        wellness: {
            activityTracking: import("../wellness/domain").ActivityTracking;
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
        };
        recordCounts: {
            water: number;
        };
        role: "user" | "super_admin";
        referralCode: string;
        hasReferrer: boolean;
        profileSetup: Record<string, unknown> | null;
        profileCompletedAt: Date | null;
        id: string;
        fullName: string | null;
        username: string | null;
        email: string | null;
        mobileNumber: string | null;
        heightValue: number | null;
        heightUnit: "cm" | "in" | null;
        weightValue: number | null;
        weightUnit: "kg" | "lb" | null;
        bmi: number | null;
        status: "active" | "disabled" | "pending";
        createdAt: Date;
        updatedAt: Date;
    }>;
    update(u: RequestUser, id: string, body: unknown): Promise<import("../auth/dto/auth-response.dto").SafeUserDto>;
    action(u: RequestUser, id: string, body: unknown): Promise<import("../auth/dto/auth-response.dto").SafeUserDto>;
    records(u: RequestUser, id: string, type: string, page?: number): Promise<{
        id: string;
        userId: string;
        amountMl: number;
        loggedAt: Date;
        day: string;
        targetMl: number;
        taskId: string | null;
    }[] | {
        id: string;
        userId: string;
        startDate: string;
        endDate: string | null;
    }[] | {
        userId: string;
        day: string;
        flow: string;
        symptoms: string[];
        mood: string | null;
        notes: string;
    }[]>;
    tracking(u: RequestUser, id: string, body: unknown): Promise<{
        activityTracking: import("../wellness/domain").ActivityTracking;
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
    image(id: string, response: Response): Promise<void>;
    banners(): Promise<{
        id: string;
        title: string;
        alt: string;
        route: string | null;
        published: boolean;
        sortOrder: number;
        updatedAt: Date;
    }[]>;
    upload(u: RequestUser, file: Express.Multer.File | undefined, body: unknown): Promise<{
        id: string;
    } | undefined>;
    banner(u: RequestUser, id: string, body: unknown): Promise<{
        id: string;
    }>;
    remove(u: RequestUser, id: string): Promise<{
        deleted: boolean;
    }>;
    audit(page?: number): Promise<{
        id: string;
        actorId: string;
        targetId: string | null;
        action: string;
        outcome: string;
        createdAt: Date;
    }[]>;
}
