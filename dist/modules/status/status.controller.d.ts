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
            requestId: string;
            authentication: "absent" | "provided" | "authenticated";
            source: "client" | "monitor" | "labelled-smoke-test";
            response: import("../../common/logging/response-summary").ResponseSummary;
            contentType: string;
            responseBytes: number | null;
        }[];
    };
    ping(): {
        service: string;
        status: string;
        timestamp: string;
    };
}
