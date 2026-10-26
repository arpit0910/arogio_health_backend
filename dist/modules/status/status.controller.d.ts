import { RequestActivityService } from './request-activity.service';
export declare class StatusController {
    private readonly activity;
    constructor(activity: RequestActivityService);
    diagnostics(): {
        service: string;
        instanceId: `${string}-${string}-${string}-${string}-${string}`;
        startedAt: string;
        timestamp: string;
        apiPrefix: string;
        counts: {
            apiRequests: number;
            clientErrors: number;
            serverErrors: number;
            probes: number;
        };
        recent: {
            timestamp: string;
            method: string;
            route: string;
            status: number;
            durationMs: number;
            kind: "api" | "probe";
        }[];
    };
    ping(): {
        service: string;
        status: string;
        timestamp: string;
    };
}
