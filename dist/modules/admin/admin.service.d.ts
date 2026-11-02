import { DatabaseService } from '../../database/database.service';
import { PasswordService } from '../auth/password.service';
import { WellnessService } from '../wellness/wellness.service';
import { UsersService } from '../users/users.service';
export declare class AdminService {
    private readonly database;
    private readonly passwords;
    private readonly wellness;
    private readonly profiles;
    constructor(database: DatabaseService, passwords: PasswordService, wellness: WellnessService, profiles: UsersService);
    private parse;
    audit<T>(actorId: string, action: string, targetId: string | null, operation: () => Promise<T>): Promise<T>;
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
    listUsers(query: unknown): Promise<{
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
    user(id: string): Promise<{
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
    createUser(body: unknown): Promise<import("../auth/dto/auth-response.dto").SafeUserDto>;
    updateUser(id: string, body: unknown): Promise<import("../auth/dto/auth-response.dto").SafeUserDto>;
    accountAction(actor: string, id: string, body: unknown): Promise<import("../auth/dto/auth-response.dto").SafeUserDto>;
    records(id: string, type: string, page?: number): Promise<{
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
    mutateWellness(id: string, body: unknown): Promise<{
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
    image(id: string): Promise<Buffer<ArrayBufferLike>>;
    listBanners(): Promise<{
        id: string;
        title: string;
        alt: string;
        route: string | null;
        published: boolean;
        sortOrder: number;
        updatedAt: Date;
    }[]>;
    upload(actor: string, file: Express.Multer.File | undefined, body: unknown): Promise<{
        id: string;
    } | undefined>;
    updateBanner(id: string, body: unknown): Promise<{
        id: string;
    }>;
    deleteBanner(id: string): Promise<{
        deleted: boolean;
    }>;
    auditLog(page?: number): Promise<{
        id: string;
        actorId: string;
        targetId: string | null;
        action: string;
        outcome: string;
        createdAt: Date;
    }[]>;
}
