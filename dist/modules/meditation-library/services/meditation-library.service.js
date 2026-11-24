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
exports.MeditationLibraryService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const zod_1 = require("zod");
const database_service_1 = require("../../../database/database.service");
const schema_1 = require("../../../database/schema");
const meditation_library_input_1 = require("../requests/meditation-library.input");
let MeditationLibraryService = class MeditationLibraryService {
    database;
    constructor(database) {
        this.database = database;
    }
    parse(schema, value) {
        const result = schema.safeParse(value);
        if (!result.success)
            throw new common_1.BadRequestException(result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; '));
        return result.data;
    }
    async list(query, admin = false) {
        const q = this.parse(meditation_library_input_1.meditationListInput, query);
        const conditions = admin ? [] : [(0, drizzle_orm_1.eq)(schema_1.meditationLibraryItems.published, true)];
        if (q.search)
            conditions.push((0, drizzle_orm_1.or)((0, drizzle_orm_1.ilike)(schema_1.meditationLibraryItems.title_en, `%${q.search}%`), (0, drizzle_orm_1.ilike)(schema_1.meditationLibraryItems.title_hi, `%${q.search}%`)));
        if (q.section)
            conditions.push((0, drizzle_orm_1.eq)(schema_1.meditationLibraryItems.section, q.section));
        if (q.kind)
            conditions.push((0, drizzle_orm_1.eq)(schema_1.meditationLibraryItems.kind, q.kind));
        const [rows, totals] = await Promise.all([
            this.database.db
                .select()
                .from(schema_1.meditationLibraryItems)
                .where((0, drizzle_orm_1.and)(...conditions))
                .orderBy((0, drizzle_orm_1.asc)(schema_1.meditationLibraryItems.sortOrder), (0, drizzle_orm_1.asc)(schema_1.meditationLibraryItems.id))
                .limit(q.limit + 1)
                .offset((q.page - 1) * q.limit),
            this.database.db
                .select({ value: (0, drizzle_orm_1.count)() })
                .from(schema_1.meditationLibraryItems)
                .where((0, drizzle_orm_1.and)(...conditions)),
        ]);
        return {
            items: rows.slice(0, q.limit).map((row) => this.present(row, admin)),
            page: q.page,
            hasNext: rows.length > q.limit,
            total: totals[0].value,
        };
    }
    present(row, admin) {
        const { createdBy, ...publicRow } = row;
        return admin
            ? {
                ...publicRow,
                createdBy,
                youtubeUrl: row.videoId ? `https://www.youtube.com/watch?v=${row.videoId}` : '',
            }
            : publicRow;
    }
    async get(id, admin = true) {
        const uuid = this.parse(zod_1.z.uuid(), id);
        const [row] = await this.database.db
            .select()
            .from(schema_1.meditationLibraryItems)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.meditationLibraryItems.id, uuid), admin ? undefined : (0, drizzle_orm_1.eq)(schema_1.meditationLibraryItems.published, true)))
            .limit(1);
        if (!row)
            throw new common_1.NotFoundException('Meditation content not found');
        return this.present(row, admin);
    }
    async save(id, actor, body) {
        const data = this.parse(meditation_library_input_1.meditationInput, body);
        const { youtubeUrl, expectedUpdatedAt, ...values } = data;
        const record = {
            ...values,
            videoId: data.kind === 'video' ? (0, meditation_library_input_1.youtubeVideoId)(youtubeUrl) : null,
            durationSeconds: data.kind === 'practice'
                ? data.steps.reduce((sum, step) => sum + step.seconds, 0) * data.repeat
                : data.durationSeconds,
            updatedAt: new Date(),
        };
        const uuid = id ? this.parse(zod_1.z.uuid(), id) : null;
        if (uuid && !expectedUpdatedAt)
            throw new common_1.BadRequestException('Reload the content before saving changes.');
        return this.database.db.transaction(async (tx) => {
            const [row] = uuid && expectedUpdatedAt
                ? await tx.update(schema_1.meditationLibraryItems).set({
                    ...record,
                    publishedVersion: data.published ? (0, drizzle_orm_1.sql) `${schema_1.meditationLibraryItems.publishedVersion} + 1` : undefined,
                    updatedAt: (0, drizzle_orm_1.sql) `greatest(date_trunc('milliseconds', clock_timestamp()), ${schema_1.meditationLibraryItems.updatedAt} + interval '1 millisecond')`,
                }).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.meditationLibraryItems.id, uuid), (0, drizzle_orm_1.eq)(schema_1.meditationLibraryItems.updatedAt, new Date(expectedUpdatedAt)))).returning()
                : await tx.insert(schema_1.meditationLibraryItems).values({
                    ...record, createdBy: actor, publishedVersion: data.published ? 1 : 0,
                }).returning();
            if (!row) {
                const [existing] = await tx.select({ id: schema_1.meditationLibraryItems.id }).from(schema_1.meditationLibraryItems).where((0, drizzle_orm_1.eq)(schema_1.meditationLibraryItems.id, uuid));
                if (!existing)
                    throw new common_1.NotFoundException('Meditation content not found');
                throw new common_1.ConflictException('This content changed. Reload it before saving.');
            }
            if (row.published) {
                await tx.insert(schema_1.wellnessPublicationVersions).values({
                    itemId: row.id,
                    version: row.publishedVersion,
                    manifest: this.present(row, false),
                    publishedBy: actor,
                    publishedAt: row.updatedAt,
                });
            }
            return this.present(row, true);
        });
    }
    async publicationHistory(id) {
        const uuid = this.parse(zod_1.z.uuid(), id);
        return this.database.db.select().from(schema_1.wellnessPublicationVersions).where((0, drizzle_orm_1.eq)(schema_1.wellnessPublicationVersions.itemId, uuid))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.wellnessPublicationVersions.version));
    }
    async remove(id) {
        const uuid = this.parse(zod_1.z.uuid(), id);
        const [row] = await this.database.db
            .delete(schema_1.meditationLibraryItems)
            .where((0, drizzle_orm_1.eq)(schema_1.meditationLibraryItems.id, uuid))
            .returning({ id: schema_1.meditationLibraryItems.id });
        if (!row)
            throw new common_1.NotFoundException('Meditation content not found');
        return { deleted: true };
    }
};
exports.MeditationLibraryService = MeditationLibraryService;
exports.MeditationLibraryService = MeditationLibraryService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.DatabaseService])
], MeditationLibraryService);
//# sourceMappingURL=meditation-library.service.js.map