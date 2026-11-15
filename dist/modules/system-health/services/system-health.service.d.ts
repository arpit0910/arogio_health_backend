import { DatabaseService } from '../../../database/database.service';
export declare class SystemHealthService {
    private readonly database;
    constructor(database: DatabaseService);
    liveness(): {
        status: 'ok';
        timestamp: string;
    };
    readiness(): Promise<{
        status: 'ready';
        checks: {
            database: 'up';
        };
        timestamp: string;
    }>;
}
