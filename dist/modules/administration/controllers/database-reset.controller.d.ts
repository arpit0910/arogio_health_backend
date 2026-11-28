import type { RequestUser } from '../../../common/authentication/request-user';
import { DatabaseResetService } from '../services/database-reset.service';
export declare class DatabaseResetController {
    private readonly service;
    constructor(service: DatabaseResetService);
    preview(user: RequestUser, body: unknown): Promise<{
        host: string;
        environment: string | undefined;
        confirmation: string;
        expiresAt: number;
        previewToken: string;
        database: string;
        tables: {
            name: string;
            records: string;
        }[];
    }>;
    apply(user: RequestUser, body: unknown): Promise<{
        reset: boolean;
        tableCount: number;
        remainingRecords: number;
    }>;
}
