"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isUniqueViolation = isUniqueViolation;
exports.getDatabaseErrorCode = getDatabaseErrorCode;
function isUniqueViolation(error, constraint) {
    const visited = new Set();
    let current = error;
    while (typeof current === 'object' && current !== null && !visited.has(current)) {
        visited.add(current);
        const candidate = current;
        if (candidate.code === '23505' && (!constraint || candidate.constraint === constraint))
            return true;
        current = candidate.cause;
    }
    return false;
}
function getDatabaseErrorCode(error) {
    const visited = new Set();
    let current = error;
    const networkCodes = new Set([
        'ECONNREFUSED',
        'ENOTFOUND',
        'ETIMEDOUT',
        'ENETUNREACH',
        'SELF_SIGNED_CERT_IN_CHAIN',
        'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
        'DEPTH_ZERO_SELF_SIGNED_CERT',
        'CERT_HAS_EXPIRED',
    ]);
    while (typeof current === 'object' && current !== null && !visited.has(current)) {
        visited.add(current);
        const candidate = current;
        if (typeof candidate.code === 'string' &&
            (/^[0-9A-Z]{5}$/.test(candidate.code) || networkCodes.has(candidate.code))) {
            return candidate.code;
        }
        current = candidate.cause;
    }
    return undefined;
}
//# sourceMappingURL=database-error.js.map