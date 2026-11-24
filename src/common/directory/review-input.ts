import { z } from 'zod';

export const directoryReviewFields = {
  confirmedDetails: z.literal(true).optional(),
  reviewerName: z.string().trim().max(200).optional(),
  reviewerQualification: z.string().trim().max(200).optional(),
  evidence: z.string().trim().max(4000).optional(),
};

export const hasReviewConfirmation = (value: { confirmedDetails?: true }) =>
  value.confirmedDetails === true;

export function auditReviewSummary(value: { evidence?: string }) {
  return value.evidence || 'Listing details approved by the signed-in administrator.';
}
