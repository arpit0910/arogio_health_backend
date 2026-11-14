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
exports.AuthService = void 0;
const node_crypto_1 = require("node:crypto");
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const jwt_1 = require("@nestjs/jwt");
const api_error_1 = require("../../common/errors/api-error");
const database_error_1 = require("../../common/errors/database-error");
const measurements_1 = require("../../common/health/measurements");
const google_token_verifier_service_1 = require("../../infrastructure/google/google-token-verifier.service");
const auth_repository_1 = require("./auth.repository");
const auth_response_dto_1 = require("./dto/auth-response.dto");
const password_service_1 = require("./password.service");
function tokenHash(token) {
    return (0, node_crypto_1.createHash)('sha256').update(token, 'utf8').digest('base64url');
}
let AuthService = class AuthService {
    repository;
    passwords;
    google;
    jwt;
    accessTtl;
    refreshTtlMs;
    constructor(repository, passwords, google, jwt, config) {
        this.repository = repository;
        this.passwords = passwords;
        this.google = google;
        this.jwt = jwt;
        this.accessTtl = config.getOrThrow('JWT_ACCESS_TTL_SECONDS');
        this.refreshTtlMs = config.getOrThrow('REFRESH_TOKEN_TTL_DAYS') * 86_400_000;
    }
    async register(input) {
        let referredByUserId;
        if (input.referralCode) {
            const referrer = await this.repository.findUserByReferralCode(input.referralCode.trim().toUpperCase());
            if (!referrer || referrer.status !== 'active' || !referrer.profileCompletedAt)
                throw new api_error_1.ApiError('INVALID_REFERRAL_CODE', 'This referral code is not available. Check the code or continue without it.', common_1.HttpStatus.BAD_REQUEST);
            referredByUserId = referrer.id;
        }
        const passwordHash = await this.passwords.hash(input.password);
        const measurements = (0, measurements_1.normalizeMeasurements)(input);
        try {
            const user = await this.repository.createPasswordUser({
                email: input.email,
                passwordHash,
                referredByUserId,
                fullName: input.fullName,
                ...measurements,
            });
            return { ...(await this.createLoginSession(user.id)), user: (0, auth_response_dto_1.toSafeUser)(user) };
        }
        catch (error) {
            if ((0, database_error_1.isUniqueViolation)(error, 'users_email_unique')) {
                throw new api_error_1.ApiError('EMAIL_ALREADY_REGISTERED', 'An account with this email already exists', common_1.HttpStatus.CONFLICT);
            }
            throw error;
        }
    }
    async login(input) {
        let user = await this.repository.findUserByEmail(input.email);
        const passwordValid = await this.passwords.verify(user?.passwordHash, input.password);
        if (!user || !passwordValid) {
            throw new api_error_1.ApiError('INVALID_CREDENTIALS', 'Invalid email or password', common_1.HttpStatus.UNAUTHORIZED);
        }
        user = await this.recoverForLogin(user);
        return { ...(await this.createLoginSession(user.id)), user: (0, auth_response_dto_1.toSafeUser)(user) };
    }
    async googleLogin(input) {
        let identity;
        try {
            identity = await this.google.verify(input.idToken);
        }
        catch (error) {
            if (error instanceof api_error_1.ApiError)
                throw error;
            throw new api_error_1.ApiError('INVALID_GOOGLE_TOKEN', 'Google authentication failed', common_1.HttpStatus.UNAUTHORIZED);
        }
        let user = await this.repository.findGoogleUser(identity.subject);
        if (!user) {
            if (identity.email && (await this.repository.findUserByEmail(identity.email))) {
                throw new api_error_1.ApiError('ACCOUNT_LINK_REQUIRED', 'Sign in with the existing method before linking Google', common_1.HttpStatus.CONFLICT);
            }
            let referredByUserId;
            if (input.referralCode) {
                const referrer = await this.repository.findUserByReferralCode(input.referralCode.trim().toUpperCase());
                if (!referrer || referrer.status !== 'active' || !referrer.profileCompletedAt)
                    throw new api_error_1.ApiError('INVALID_REFERRAL_CODE', 'This referral code is not available. Check the code or continue without it.', common_1.HttpStatus.BAD_REQUEST);
                referredByUserId = referrer.id;
            }
            try {
                user = await this.repository.createGoogleUser({
                    referredByUserId,
                    subject: identity.subject,
                    email: identity.email,
                    fullName: identity.name,
                    emailVerified: identity.emailVerified,
                });
            }
            catch (error) {
                if ((0, database_error_1.isUniqueViolation)(error, 'users_email_unique')) {
                    throw new api_error_1.ApiError('ACCOUNT_LINK_REQUIRED', 'Sign in with the existing method before linking Google', common_1.HttpStatus.CONFLICT);
                }
                throw error;
            }
        }
        user = await this.recoverForLogin(user);
        return { ...(await this.createLoginSession(user.id)), user: (0, auth_response_dto_1.toSafeUser)(user) };
    }
    async recoverForLogin(user) {
        if (user.status === 'active')
            return user;
        if (user.deletionRequestedAt && user.recoverableUntil && user.recoverableUntil > new Date()) {
            const restored = await this.repository.restoreDeletedAccount(user.id);
            if (restored)
                return restored;
        }
        throw new api_error_1.ApiError('ACCOUNT_UNAVAILABLE', 'This account is unavailable. The recovery period may have ended.', common_1.HttpStatus.FORBIDDEN);
    }
    async refresh(input) {
        const refreshToken = (0, node_crypto_1.randomBytes)(32).toString('base64url');
        const sessionId = (0, node_crypto_1.randomUUID)();
        const result = await this.repository.rotateSession({
            currentTokenHash: tokenHash(input.refreshToken),
            replacement: {
                id: sessionId,
                userId: (0, node_crypto_1.randomUUID)(),
                tokenHash: tokenHash(refreshToken),
                familyId: (0, node_crypto_1.randomUUID)(),
                expiresAt: new Date(Date.now() + this.refreshTtlMs),
            },
            now: new Date(),
        });
        if (result.kind !== 'rotated') {
            throw new api_error_1.ApiError('INVALID_REFRESH_TOKEN', 'Refresh token is invalid or expired', common_1.HttpStatus.UNAUTHORIZED);
        }
        return this.buildTokenPair(result.userId, result.sessionId, refreshToken);
    }
    async logout(input) {
        await this.repository.revokeSession(tokenHash(input.refreshToken), new Date());
    }
    async createLoginSession(userId) {
        const sessionId = (0, node_crypto_1.randomUUID)();
        const familyId = (0, node_crypto_1.randomUUID)();
        const refreshToken = (0, node_crypto_1.randomBytes)(32).toString('base64url');
        await this.repository.createSession({
            id: sessionId,
            userId,
            familyId,
            tokenHash: tokenHash(refreshToken),
            expiresAt: new Date(Date.now() + this.refreshTtlMs),
        });
        return this.buildTokenPair(userId, sessionId, refreshToken);
    }
    async buildTokenPair(userId, sessionId, refreshToken) {
        return {
            accessToken: await this.jwt.signAsync({ sub: userId, sid: sessionId }),
            refreshToken,
            tokenType: 'Bearer',
            expiresIn: this.accessTtl,
        };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [auth_repository_1.AuthRepository,
        password_service_1.PasswordService,
        google_token_verifier_service_1.GoogleTokenVerifier,
        jwt_1.JwtService,
        config_1.ConfigService])
], AuthService);
//# sourceMappingURL=auth.service.js.map