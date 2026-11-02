import type { NextFunction, Request, Response } from 'express';
import { type ResponseSummary } from '../../common/logging/response-summary';
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
            requestId: string;
            authentication: "absent" | "provided" | "authenticated";
            source: "client" | "monitor" | "labelled-smoke-test";
            response: ResponseSummary;
            contentType: string;
            responseBytes: number | null;
        }[];
    };
}
