import { DatabaseService } from '../../database/database.service';
export declare class ChatContextService {
    private readonly database;
    constructor(database: DatabaseService);
    forUser(userId: string, now?: Date): Promise<{
        asOf: string;
        timezone: string;
        range: {
            from: string;
            through: string;
        };
        source: string;
        profile: {
            ageYears: number | null;
            heightCm: number | null;
            weightKg: number | null;
            activityLevel: string | null;
            healthGoals: (string | null)[];
        };
        activity: {
            goals: {
                [k: string]: number | undefined;
            };
            days: {
                day: string;
                values: {
                    [k: string]: number | undefined;
                };
            }[];
        };
        water: {
            targetMl: number | null;
            loggedDailyTotals: {
                day: string;
                loggedMl: number;
            }[];
        };
        medicines: {
            totalSaved: number;
            entries: {
                name: string | null;
                remindersEnabled: boolean;
                scheduledDoses: {
                    time: string | null;
                    amount: string | null;
                }[];
            }[];
            note: string;
        };
        cycle: {
            recordedCycleLength: number | null;
            recordedPeriodLength: number | null;
            recentPeriods: {
                startDate: string;
                endDate: string | null;
            }[];
            recentCheckIns: {
                symptoms: (string | null)[];
                mood: string | null;
                day: string;
                flow: string;
            }[];
        };
        unavailable: string[];
    }>;
}
