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
exports.UsersRepository = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const database_service_1 = require("../../database/database.service");
const schema_1 = require("../../database/schema");
let UsersRepository = class UsersRepository {
    database;
    constructor(database) {
        this.database = database;
    }
    async softDelete(id) {
        return this.database.db.transaction(async (tx) => {
            const now = new Date(), recoverableUntil = new Date(now.getTime() + 30 * 86400000);
            const [user] = await tx
                .update(schema_1.users)
                .set({ status: 'disabled', deletionRequestedAt: now, recoverableUntil, updatedAt: now })
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.users.id, id), (0, drizzle_orm_1.eq)(schema_1.users.status, 'active')))
                .returning();
            if (!user)
                return undefined;
            await tx
                .update(schema_1.authSessions)
                .set({ revokedAt: now })
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.authSessions.userId, id), (0, drizzle_orm_1.isNull)(schema_1.authSessions.revokedAt)));
            return {
                deletionRequestedAt: now.toISOString(),
                recoverableUntil: recoverableUntil.toISOString(),
            };
        });
    }
    async findById(id) {
        const [user] = await this.database.db.select().from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.id, id)).limit(1);
        return user;
    }
    async applyReferral(userId, code) {
        return this.database.db.transaction(async (tx) => {
            const [user] = await tx
                .select()
                .from(schema_1.users)
                .where((0, drizzle_orm_1.eq)(schema_1.users.id, userId))
                .limit(1)
                .for('update');
            if (!user || user.status !== 'active')
                return { kind: 'unavailable' };
            const [referrer] = await tx.select().from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.referralCode, code)).limit(1);
            if (!referrer || referrer.status !== 'active' || !referrer.profileCompletedAt)
                return { kind: 'invalid' };
            if (user.id === referrer.id)
                return { kind: 'self' };
            if (user.referredByUserId === referrer.id)
                return { kind: 'saved', user };
            if (user.referredByUserId)
                return { kind: 'already-set' };
            if (user.profileCompletedAt)
                return { kind: 'closed' };
            const [updated] = await tx
                .update(schema_1.users)
                .set({ referredByUserId: referrer.id, referredAt: new Date(), updatedAt: new Date() })
                .where((0, drizzle_orm_1.eq)(schema_1.users.id, userId))
                .returning();
            return { kind: 'saved', user: updated };
        });
    }
    async updateProfile(id, changes) {
        const [user] = await this.database.db
            .update(schema_1.users)
            .set({ ...changes, updatedAt: new Date() })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.users.id, id), (0, drizzle_orm_1.eq)(schema_1.users.status, 'active')))
            .returning();
        return user;
    }
};
exports.UsersRepository = UsersRepository;
exports.UsersRepository = UsersRepository = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.DatabaseService])
], UsersRepository);
//# sourceMappingURL=users.repository.js.map