import type { RequestUser } from '../../../common/authentication/request-user';
import { UserAccountsService } from '../../user-accounts/services/user-accounts.service';
import { PersonalWellnessService } from '../services/personal-wellness.service';
export declare class ExportController {
    private readonly users;
    private readonly wellness;
    constructor(users: UserAccountsService, wellness: PersonalWellnessService);
    get(user: RequestUser): Promise<{
        exportedAt: string;
        scope: string;
        profile: import("../../authentication/responses/authentication-response.dto").SafeUserDto;
        wellness: {
            activityTracking: import("../domain/personal-wellness.domain").ActivityTracking;
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
        };
    }>;
}
