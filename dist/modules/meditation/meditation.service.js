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
exports.MeditationService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const zod_1 = require("zod");
const database_service_1 = require("../../database/database.service");
const schema_1 = require("../../database/schema");
const meditation_input_1 = require("./meditation.input");
let MeditationService = class MeditationService {
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
        const q = this.parse(meditation_input_1.meditationListInput, query);
        const conditions = admin ? [] : [(0, drizzle_orm_1.eq)(schema_1.meditationContent.published, true)];
        if (q.search)
            conditions.push((0, drizzle_orm_1.or)((0, drizzle_orm_1.ilike)(schema_1.meditationContent.title_en, `%${q.search}%`), (0, drizzle_orm_1.ilike)(schema_1.meditationContent.title_hi, `%${q.search}%`)));
        if (q.section)
            conditions.push((0, drizzle_orm_1.eq)(schema_1.meditationContent.section, q.section));
        if (q.kind)
            conditions.push((0, drizzle_orm_1.eq)(schema_1.meditationContent.kind, q.kind));
        const [rows, totals] = await Promise.all([
            this.database.db
                .select()
                .from(schema_1.meditationContent)
                .where((0, drizzle_orm_1.and)(...conditions))
                .orderBy((0, drizzle_orm_1.asc)(schema_1.meditationContent.sortOrder), (0, drizzle_orm_1.asc)(schema_1.meditationContent.id))
                .limit(q.limit + 1)
                .offset((q.page - 1) * q.limit),
            this.database.db
                .select({ value: (0, drizzle_orm_1.count)() })
                .from(schema_1.meditationContent)
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
    async get(id) {
        const uuid = this.parse(zod_1.z.uuid(), id);
        const [row] = await this.database.db
            .select()
            .from(schema_1.meditationContent)
            .where((0, drizzle_orm_1.eq)(schema_1.meditationContent.id, uuid))
            .limit(1);
        if (!row)
            throw new common_1.NotFoundException('Meditation content not found');
        return this.present(row, true);
    }
    async save(id, actor, body) {
        const data = this.parse(meditation_input_1.meditationInput, body);
        const { youtubeUrl, expectedUpdatedAt, ...values } = data;
        const record = {
            ...values,
            videoId: data.kind === 'video' ? (0, meditation_input_1.youtubeVideoId)(youtubeUrl) : null,
            durationSeconds: data.kind === 'practice'
                ? data.steps.reduce((sum, step) => sum + step.seconds, 0) * data.repeat
                : data.durationSeconds,
            updatedAt: new Date(),
        };
        if (!id) {
            const [row] = await this.database.db
                .insert(schema_1.meditationContent)
                .values({ ...record, createdBy: actor })
                .returning();
            return this.present(row, true);
        }
        const uuid = this.parse(zod_1.z.uuid(), id);
        if (!expectedUpdatedAt)
            throw new common_1.BadRequestException('Reload the content before saving changes.');
        const [row] = await this.database.db
            .update(schema_1.meditationContent)
            .set(record)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.meditationContent.id, uuid), (0, drizzle_orm_1.eq)(schema_1.meditationContent.updatedAt, new Date(expectedUpdatedAt))))
            .returning();
        if (!row) {
            await this.get(uuid);
            throw new common_1.ConflictException('This content changed. Reload it before saving.');
        }
        return this.present(row, true);
    }
    async remove(id) {
        const uuid = this.parse(zod_1.z.uuid(), id);
        const [row] = await this.database.db
            .delete(schema_1.meditationContent)
            .where((0, drizzle_orm_1.eq)(schema_1.meditationContent.id, uuid))
            .returning({ id: schema_1.meditationContent.id });
        if (!row)
            throw new common_1.NotFoundException('Meditation content not found');
        return { deleted: true };
    }
};
exports.MeditationService = MeditationService;
exports.MeditationService = MeditationService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.DatabaseService])
], MeditationService);
//# sourceMappingURL=meditation.service.js.map