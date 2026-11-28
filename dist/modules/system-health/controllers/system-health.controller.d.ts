import { SystemHealthService } from '../services/system-health.service';
export declare class SystemHealthController {
    private readonly health;
    constructor(health: SystemHealthService);
    healthCheck(): {
        status: 'ok';
        timestamp: string;
    };
    readinessCheck(): Promise<{
        status: 'ready';
        checks: {
            database: 'up';
        };
        timestamp: string;
    }>;
}
