export interface ResponseSummary {
    outcome: 'success' | 'error';
    code: string;
    reason: string;
    databaseCode?: string;
    invalidFields?: string[];
}
export declare function summarizeError(status: number, code: string, details: unknown, error: unknown): ResponseSummary;
export declare function summarizeSuccess(status: number): ResponseSummary;
