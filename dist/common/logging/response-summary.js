"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.summarizeError = summarizeError;
exports.summarizeSuccess = summarizeSuccess;
const database_error_1 = require("../errors/database-error");
const reasons = {
    ACCESS_TOKEN_REQUIRED: 'No Bearer access token was provided. Sign in first.',
    ACCESS_TOKEN_EXPIRED: 'The access token expired. Refresh the session or sign in again.',
    INVALID_ACCESS_TOKEN: 'The Bearer access token is invalid. Sign in again.',
    INVALID_CREDENTIALS: 'Email/password authentication failed.',
    INVALID_GOOGLE_TOKEN: 'Google ID-token verification failed. Check token audience, issuer and expiry.',
    GOOGLE_VERIFICATION_UNAVAILABLE: 'The API could not retrieve Google verification keys. Check outbound HTTPS, DNS, TLS trust and server time.',
    INVALID_REFRESH_TOKEN: 'The refresh token is invalid, expired, revoked or already used.',
    VALIDATION_FAILED: 'Request validation failed. Correct the indicated fields.',
    EMAIL_ALREADY_REGISTERED: 'The email address is already registered.',
    ACCOUNT_LINK_REQUIRED: 'Sign in with the existing method before linking Google.',
    ACCOUNT_UNAVAILABLE: 'This account is unavailable.',
    SERVICE_NOT_READY: 'A required backend dependency is unavailable.',
};
const databaseReasons = {
    '42P01': 'A required database table is missing. Apply pending database migrations.',
    '42703': 'A required database column is missing. Apply pending database migrations.',
    '42501': 'The database role lacks the required permissions.',
    '28P01': 'The database rejected its configured credentials.',
    ECONNREFUSED: 'The database connection was refused.',
    ENOTFOUND: 'The database hostname could not be resolved.',
    ETIMEDOUT: 'The database connection timed out.',
    ENETUNREACH: 'The database network is unreachable.',
    SELF_SIGNED_CERT_IN_CHAIN: 'The database TLS certificate chain is not trusted.',
};
const validationFields = new Set([
    'email',
    'password',
    'fullName',
    'username',
    'idToken',
    'refreshToken',
    'heightValue',
    'heightUnit',
    'weightValue',
    'weightUnit',
    'dateOfBirth',
    'activityLevel',
    'healthGoals',
    'gender',
    'location',
    'referralSource',
    'healthReminders',
    'tipsAndInsights',
    'productUpdates',
    'step',
    'complete',
]);
function summarizeError(status, code, details, error) {
    const databaseCode = (0, database_error_1.getDatabaseErrorCode)(error);
    const knownCode = code === 'INTERNAL_ERROR' || Object.hasOwn(reasons, code);
    const googleReasons = {
        AUDIENCE_MISMATCH: 'Google ID-token audience does not match the deployed GOOGLE_CLIENT_IDS. Configure the shared Web client ID on the server.',
        EXPIRED: 'Google ID token has expired. Obtain a fresh Google sign-in token.',
        CLOCK_SKEW: 'Google ID token is not valid yet. Check the API server clock.',
        INVALID_TOKEN: 'Google ID-token signature, issuer or format could not be verified.',
    };
    const googleReason = code === 'INVALID_GOOGLE_TOKEN' &&
        typeof details === 'object' &&
        details !== null &&
        'googleReason' in details &&
        typeof details.googleReason === 'string' &&
        Object.hasOwn(googleReasons, details.googleReason)
        ? details.googleReason
        : undefined;
    const reason = (googleReason && googleReasons[googleReason]) ||
        (databaseCode && databaseReasons[databaseCode]) ||
        (Object.hasOwn(reasons, code) ? reasons[code] : undefined) ||
        (status === 401
            ? 'Authentication is required or failed.'
            : status === 403
                ? 'Access to this endpoint is forbidden.'
                : status === 404
                    ? 'No API route matches this request.'
                    : status === 429
                        ? 'Too many requests. Wait before retrying.'
                        : status >= 500
                            ? 'An internal operation failed. Correlate the request ID with server logs.'
                            : 'The API rejected the request.');
    const invalidFields = code === 'VALIDATION_FAILED' && typeof details === 'object' && details !== null
        ? Object.keys(details)
            .filter((field) => validationFields.has(field))
            .slice(0, 24)
        : [];
    return {
        outcome: 'error',
        code: knownCode ? code : `HTTP_${status}`,
        reason,
        ...(databaseCode && Object.hasOwn(databaseReasons, databaseCode) ? { databaseCode } : {}),
        ...(invalidFields.length ? { invalidFields } : {}),
    };
}
function summarizeSuccess(status) {
    return {
        outcome: 'success',
        code: `HTTP_${status}`,
        reason: status === 204
            ? 'Completed; no response body.'
            : 'Request completed successfully. Response body omitted from the public monitor.',
    };
}
//# sourceMappingURL=response-summary.js.map