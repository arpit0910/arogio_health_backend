import { DatabaseService } from '../../../database/database.service';
export declare class PracticeHistoryService {
    private readonly database;
    constructor(database: DatabaseService);
    complete(userId: string, body: unknown): Promise<{
        attemptId: string;
        completedAt: Date;
    }>;
    list(userId: string): Promise<{
        totalSessions: number;
        totalSeconds: number;
        items: {
            title_en: unknown;
            title_hi: unknown;
            id: string;
            version: number;
            elapsedSeconds: number;
            completedAt: Date;
        }[];
    }>;
}
