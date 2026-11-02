"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoogleTokenVerifierService = exports.GoogleTokenVerifier = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const google_auth_library_1 = require("google-auth-library");
const api_error_1 = require("../../common/errors/api-error");
const common_2 = require("@nestjs/common");
class GoogleTokenVerifier {
}
exports.GoogleTokenVerifier = GoogleTokenVerifier;
let GoogleTokenVerifierService = class GoogleTokenVerifierService {
    client = new google_auth_library_1.OAuth2Client();
    audiences;
    constructor(config) {
        this.audiences = config.getOrThrow('GOOGLE_CLIENT_IDS');
    }
    async verify(idToken) {
        let ticket;
        try {
            ticket = await this.client.verifyIdToken({ idToken, audience: this.audiences });
        }
        catch (error) {
            const message = error instanceof Error ? error.message : '';
            const code = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : '';
            if (/Wrong recipient/.test(message)) {
                throw new api_error_1.ApiError('INVALID_GOOGLE_TOKEN', 'Google sign-in is not configured for this app version. Please use email sign-in while setup is corrected.', common_2.HttpStatus.UNAUTHORIZED, { googleReason: 'AUDIENCE_MISMATCH' });
            }
            if (/Token used too late/.test(message)) {
                throw new api_error_1.ApiError('INVALID_GOOGLE_TOKEN', 'Google sign-in expired. Please choose your Google account again.', common_2.HttpStatus.UNAUTHORIZED, { googleReason: 'EXPIRED' });
            }
            if (/Token used too early/.test(message)) {
                throw new api_error_1.ApiError('INVALID_GOOGLE_TOKEN', 'Google sign-in could not verify the sign-in time. Please try again.', common_2.HttpStatus.UNAUTHORIZED, { googleReason: 'CLOCK_SKEW' });
            }
            if (/Failed to retrieve verification certificates/.test(message) ||
                [
                    'ENOTFOUND',
                    'ECONNRESET',
                    'ETIMEDOUT',
                    'ECONNREFUSED',
                    'EAI_AGAIN',
                    'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
                    'CERT_HAS_EXPIRED',
                ].includes(code)) {
                throw new api_error_1.ApiError('GOOGLE_VERIFICATION_UNAVAILABLE', 'Google sign-in is temporarily unavailable. Please try again or sign in with email.', common_2.HttpStatus.SERVICE_UNAVAILABLE);
            }
            throw new api_error_1.ApiError('INVALID_GOOGLE_TOKEN', 'Google authentication failed. Please choose your Google account again.', common_2.HttpStatus.UNAUTHORIZED, { googleReason: 'INVALID_TOKEN' });
        }
        const payload = ticket.getPayload();
        if (!payload?.sub)
            throw new Error('Google token has no subject');
        return {
            subject: payload.sub,
            email: payload.email?.trim().toLowerCase() ?? null,
            emailVerified: payload.email_verified === true,
            name: payload.name?.trim() || null,
        };
    }
};
exports.GoogleTokenVerifierService = GoogleTokenVerifierService;
exports.GoogleTokenVerifierService = GoogleTokenVerifierService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], GoogleTokenVerifierService);
//# sourceMappingURL=google-token-verifier.service.js.map