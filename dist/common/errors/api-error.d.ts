import { HttpStatus } from '@nestjs/common';
export declare class ApiError extends Error {
    readonly code: string;
    readonly status: HttpStatus;
    readonly details?: unknown | undefined;
    constructor(code: string, message: string, status: HttpStatus, details?: unknown | undefined);
}
