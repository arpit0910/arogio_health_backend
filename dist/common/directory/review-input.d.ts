import { z } from 'zod';
export declare const directoryReviewFields: {
    confirmedDetails: z.ZodOptional<z.ZodLiteral<true>>;
    reviewerName: z.ZodOptional<z.ZodString>;
    reviewerQualification: z.ZodOptional<z.ZodString>;
    evidence: z.ZodOptional<z.ZodString>;
};
export declare const hasReviewConfirmation: (value: {
    confirmedDetails?: true;
}) => boolean;
export declare function auditReviewSummary(value: {
    evidence?: string;
}): string;
