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
exports.PracticeHistoryService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const zod_1 = require("zod");
const database_service_1 = require("../../../database/database.service");
const schema_1 = require("../../../database/schema");
const completion = zod_1.z.object({
    attemptId: zod_1.z.uuid(),
    itemId: zod_1.z.uuid(),
    version: zod_1.z.number().int().positive().max(2147483647),
    elapsedSeconds: zod_1.z.number().int().positive().max(3600),
}).strict();
let PracticeHistoryService = class PracticeHistoryService {
    database;
    constructor(database) {
        this.database = database;
    }
    async complete(userId, body) {
        const parsed = completion.safeParse(body);
        if (!parsed.success)
            throw new common_1.BadRequestException('Invalid practice completion.');
        const input = parsed.data;
        const db = this.database.db;
        const [publication] = await db.select({ manifest: schema_1.wellnessPublicationVersions.manifest })
            .from(schema_1.wellnessPublicationVersions).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.wellnessPublicationVersions.itemId, input.itemId), (0, drizzle_orm_1.eq)(schema_1.wellnessPublicationVersions.version, input.version)));
        if (!publication || publication.manifest.kind !== 'practice')
            throw new common_1.NotFoundException('Practice version not found.');
        if (publication.manifest.durationSeconds !== input.elapsedSeconds)
            throw new common_1.BadRequestException('Completion time must match the selected practice version.');
        const [created] = await db.insert(schema_1.wellnessPracticeHistory).values({ ...input, userId }).onConflictDoNothing()
            .returning({ attemptId: schema_1.wellnessPracticeHistory.attemptId, completedAt: schema_1.wellnessPracticeHistory.completedAt });
        if (created)
            return created;
        const [existing] = await db.select().from(schema_1.wellnessPracticeHistory)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.wellnessPracticeHistory.userId, userId), (0, drizzle_orm_1.eq)(schema_1.wellnessPracticeHistory.attemptId, input.attemptId)));
        if (!existing || existing.itemId !== input.itemId || existing.version !== input.version)
            throw new common_1.ConflictException('This practice attempt is already used.');
        return { attemptId: existing.attemptId, completedAt: existing.completedAt };
    }
    async list(userId) {
        const db = this.database.db;
        const [totals, rows] = await Promise.all([
            db.select({ sessions: (0, drizzle_orm_1.count)(), seconds: (0, drizzle_orm_1.sum)(schema_1.wellnessPracticeHistory.elapsedSeconds) }).from(schema_1.wellnessPracticeHistory).where((0, drizzle_orm_1.eq)(schema_1.wellnessPracticeHistory.userId, userId)),
            db.select({
                id: schema_1.wellnessPracticeHistory.attemptId,
                version: schema_1.wellnessPracticeHistory.version,
                elapsedSeconds: schema_1.wellnessPracticeHistory.elapsedSeconds,
                completedAt: schema_1.wellnessPracticeHistory.completedAt,
                manifest: schema_1.wellnessPublicationVersions.manifest,
            }).from(schema_1.wellnessPracticeHistory).innerJoin(schema_1.wellnessPublicationVersions, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.wellnessPracticeHistory.itemId, schema_1.wellnessPublicationVersions.itemId), (0, drizzle_orm_1.eq)(schema_1.wellnessPracticeHistory.version, schema_1.wellnessPublicationVersions.version)))
                .where((0, drizzle_orm_1.eq)(schema_1.wellnessPracticeHistory.userId, userId)).orderBy((0, drizzle_orm_1.desc)(schema_1.wellnessPracticeHistory.completedAt), (0, drizzle_orm_1.desc)(schema_1.wellnessPracticeHistory.attemptId)).limit(50),
        ]);
        return {
            totalSessions: totals[0]?.sessions ?? 0,
            totalSeconds: Number(totals[0]?.seconds ?? 0),
            items: rows.map(({ manifest, ...row }) => ({
                ...row, title_en: manifest.title_en, title_hi: manifest.title_hi,
            })),
        };
    }
};
exports.PracticeHistoryService = PracticeHistoryService;
exports.PracticeHistoryService = PracticeHistoryService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.DatabaseService])
], PracticeHistoryService);
//# sourceMappingURL=practice-history.service.js.map