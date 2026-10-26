import type { NextFunction, Request, Response } from 'express';
export declare class RequestActivityService {
    private readonly instanceId;
    private readonly startedAt;
    private readonly recent;
    private apiRequests;
    private clientErrors;
    private serverErrors;
    private probes;
    readonly middleware: (request: Request, response: Response, next: NextFunction) => void;
    snapshot(): {
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
}
