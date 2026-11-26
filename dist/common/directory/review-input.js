"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasReviewConfirmation = exports.directoryReviewFields = void 0;
exports.auditReviewSummary = auditReviewSummary;
const zod_1 = require("zod");
exports.directoryReviewFields = {
    confirmedDetails: zod_1.z.literal(true).optional(),
    reviewerName: zod_1.z.string().trim().max(200).optional(),
    reviewerQualification: zod_1.z.string().trim().max(200).optional(),
    evidence: zod_1.z.string().trim().max(4000).optional(),
};
const hasReviewConfirmation = (value) => value.confirmedDetails === true;
exports.hasReviewConfirmation = hasReviewConfirmation;
function auditReviewSummary(value) {
    return value.evidence || 'Listing details approved by the signed-in administrator.';
}
//# sourceMappingURL=review-input.js.map