import type { RequestUser } from '../../common/auth/request-user';
import { UsersService } from '../users/users.service';
import { WellnessService } from './wellness.service';
export declare class ExportController {
    private readonly users;
    private readonly wellness;
    constructor(users: UsersService, wellness: WellnessService);
    get(user: RequestUser): Promise<{
        exportedAt: string;
        scope: string;
        profile: import("../auth/dto/auth-response.dto").SafeUserDto;
        wellness: {
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
            medicineDoses: {
                medicineId: string;
                day: string;
                time: string;
                status: "pending" | "skipped" | "taken";
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
        };
    }>;
}
