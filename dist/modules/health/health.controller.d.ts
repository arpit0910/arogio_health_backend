import { HealthService } from './health.service';
export declare class HealthController {
    private readonly health;
    constructor(health: HealthService);
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
