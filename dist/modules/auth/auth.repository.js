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
exports.AuthRepository = void 0;
const common_1 = require("@nestjs/common");
const api_error_1 = require("../../common/errors/api-error");
const database_error_1 = require("../../common/errors/database-error");
const common_2 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const database_service_1 = require("../../database/database.service");
const schema_1 = require("../../database/schema");
let AuthRepository = class AuthRepository {
    database;
    constructor(database) {
        this.database = database;
    }
    async isAccessSessionActive(userId, sessionId) {
        const [session] = await this.database.db
            .select({ id: schema_1.authSessions.id })
            .from(schema_1.authSessions)
            .innerJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.users.id, schema_1.authSessions.userId))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.users.id, userId), (0, drizzle_orm_1.eq)(schema_1.users.status, 'active'), (0, drizzle_orm_1.eq)(schema_1.authSessions.id, sessionId), (0, drizzle_orm_1.isNull)(schema_1.authSessions.revokedAt), (0, drizzle_orm_1.gt)(schema_1.authSessions.expiresAt, new Date())))
            .limit(1);
        return Boolean(session);
    }
    async restoreDeletedAccount(id) {
        const [user] = await this.database.db
            .update(schema_1.users)
            .set({
            status: 'active',
            deletionRequestedAt: null,
            recoverableUntil: null,
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.users.id, id), (0, drizzle_orm_1.eq)(schema_1.users.status, 'disabled'), (0, drizzle_orm_1.gt)(schema_1.users.recoverableUntil, new Date())))
            .returning();
        return user;
    }
    async findUserByEmail(email) {
        const [user] = await this.database.db
            .select()
            .from(schema_1.users)
            .where((0, drizzle_orm_1.eq)(schema_1.users.email, email))
            .limit(1);
        return user;
    }
    async findUserByReferralCode(code) {
        const [user] = await this.database.db
            .select()
            .from(schema_1.users)
            .where((0, drizzle_orm_1.eq)(schema_1.users.referralCode, code))
            .limit(1);
        return user;
    }
    async retryReferralCollision(action) {
        for (let attempt = 0;; attempt++) {
            try {
                return await action();
            }
            catch (error) {
                if (attempt >= 4 || !(0, database_error_1.isUniqueViolation)(error, 'users_referral_code_unique'))
                    throw error;
            }
        }
    }
    async findUserById(id) {
        const [user] = await this.database.db.select().from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.id, id)).limit(1);
        return user;
    }
    async createPasswordUser(input) {
        const [user] = await this.retryReferralCollision(() => this.database.db
            .insert(schema_1.users)
            .values({
            referredByUserId: input.referredByUserId,
            referredAt: input.referredByUserId ? new Date() : undefined,
            email: input.email,
            passwordHash: input.passwordHash,
            fullName: input.fullName,
            heightValue: input.heightValue,
            heightUnit: input.heightUnit,
            weightValue: input.weightValue,
            weightUnit: input.weightUnit,
            heightCm: input.heightCm,
            weightKg: input.weightKg,
        })
            .returning());
        if (!user)
            throw new Error('User insert returned no row');
        return user;
    }
    async findGoogleUser(subject) {
        const [result] = await this.database.db
            .select({ user: schema_1.users })
            .from(schema_1.authIdentities)
            .innerJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.authIdentities.userId, schema_1.users.id))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.authIdentities.provider, 'google'), (0, drizzle_orm_1.eq)(schema_1.authIdentities.providerSubject, subject)))
            .limit(1);
        return result?.user;
    }
    async createGoogleUser(input) {
        try {
            return await this.retryReferralCollision(() => this.database.db.transaction(async (tx) => {
                const [user] = await tx
                    .insert(schema_1.users)
                    .values({
                    referredByUserId: input.referredByUserId,
                    referredAt: input.referredByUserId ? new Date() : undefined,
                    email: input.email,
                    fullName: input.fullName,
                    emailVerifiedAt: input.emailVerified && input.email ? new Date() : null,
                })
                    .returning();
                if (!user)
                    throw new Error('Google user insert returned no row');
                await tx.insert(schema_1.authIdentities).values({
                    userId: user.id,
                    provider: 'google',
                    providerSubject: input.subject,
                    providerEmail: input.email,
                });
                return user;
            }));
        }
        catch (error) {
            const existing = await this.findGoogleUser(input.subject);
            if (existing)
                return existing;
            throw error;
        }
    }
    async createSession(session) {
        await this.database.db.transaction(async (tx) => {
            const [user] = await tx
                .select()
                .from(schema_1.users)
                .where((0, drizzle_orm_1.eq)(schema_1.users.id, session.userId))
                .limit(1)
                .for('update');
            if (!user || user.status !== 'active')
                throw new api_error_1.ApiError('ACCOUNT_UNAVAILABLE', 'This account is unavailable', common_1.HttpStatus.FORBIDDEN);
            await tx.insert(schema_1.authSessions).values(session);
        });
    }
    async rotateSession(input) {
        return this.database.db.transaction(async (tx) => {
            const [candidate] = await tx
                .select()
                .from(schema_1.authSessions)
                .where((0, drizzle_orm_1.eq)(schema_1.authSessions.tokenHash, input.currentTokenHash))
                .limit(1);
            if (!candidate)
                return { kind: 'invalid' };
            const [user] = await tx
                .select()
                .from(schema_1.users)
                .where((0, drizzle_orm_1.eq)(schema_1.users.id, candidate.userId))
                .limit(1)
                .for('update');
            const [current] = await tx
                .select()
                .from(schema_1.authSessions)
                .where((0, drizzle_orm_1.eq)(schema_1.authSessions.tokenHash, input.currentTokenHash))
                .limit(1)
                .for('update');
            if (!current)
                return { kind: 'invalid' };
            if (current.revokedAt) {
                await tx
                    .update(schema_1.authSessions)
                    .set({ revokedAt: input.now })
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.authSessions.familyId, current.familyId), (0, drizzle_orm_1.isNull)(schema_1.authSessions.revokedAt)));
                return { kind: 'reused' };
            }
            if (current.expiresAt <= input.now) {
                await tx
                    .update(schema_1.authSessions)
                    .set({ revokedAt: input.now, lastUsedAt: input.now })
                    .where((0, drizzle_orm_1.eq)(schema_1.authSessions.id, current.id));
                return { kind: 'expired' };
            }
            if (!user || user.status !== 'active') {
                await tx
                    .update(schema_1.authSessions)
                    .set({ revokedAt: input.now })
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.authSessions.familyId, current.familyId), (0, drizzle_orm_1.isNull)(schema_1.authSessions.revokedAt)));
                return { kind: 'disabled' };
            }
            await tx.insert(schema_1.authSessions).values({
                ...input.replacement,
                userId: current.userId,
                familyId: current.familyId,
            });
            await tx
                .update(schema_1.authSessions)
                .set({
                revokedAt: input.now,
                lastUsedAt: input.now,
                replacedBySessionId: input.replacement.id,
            })
                .where((0, drizzle_orm_1.eq)(schema_1.authSessions.id, current.id));
            return { kind: 'rotated', userId: current.userId, sessionId: input.replacement.id };
        });
    }
    async revokeSession(tokenHash, now) {
        await this.database.db
            .update(schema_1.authSessions)
            .set({ revokedAt: now, lastUsedAt: now })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.authSessions.tokenHash, tokenHash), (0, drizzle_orm_1.isNull)(schema_1.authSessions.revokedAt)));
    }
};
exports.AuthRepository = AuthRepository;
exports.AuthRepository = AuthRepository = __decorate([
    (0, common_2.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.DatabaseService])
], AuthRepository);
//# sourceMappingURL=auth.repository.js.map