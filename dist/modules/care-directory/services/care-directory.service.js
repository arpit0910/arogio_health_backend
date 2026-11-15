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
exports.CareDirectoryService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const zod_1 = require("zod");
const database_service_1 = require("../../../database/database.service");
const schema_1 = require("../../../database/schema");
const care_directory_input_1 = require("../requests/care-directory.input");
let CareDirectoryService = class CareDirectoryService {
    database;
    constructor(database) {
        this.database = database;
    }
    parse(schema, value) {
        const parsed = schema.safeParse(value);
        if (!parsed.success)
            throw new common_1.BadRequestException(parsed.error.issues.map((i) => i.message).join(' '));
        return parsed.data;
    }
    publicFilter() {
        return [
            (0, drizzle_orm_1.eq)(schema_1.careDirectoryEntries.published, true),
            (0, drizzle_orm_1.gte)(schema_1.careDirectoryEntries.reviewedAt, new Date(Date.now() - 180 * 86400000)),
            (0, drizzle_orm_1.eq)(schema_1.careDirectoryEntries.city, 'Jaipur'),
        ];
    }
    present(row, admin) {
        if (admin)
            return row;
        const publicRow = { ...row, reviewedBy: undefined, reviewEvidence: undefined };
        return { ...publicRow, verification: 'source-reviewed', freshnessDays: 180 };
    }
    async list(query, admin = false) {
        const q = this.parse(care_directory_input_1.careQuery, query);
        if (q.city.toLowerCase() !== 'jaipur')
            return { items: [], hasNext: false, page: q.page, coverage: 'unsupported-city' };
        const filters = admin ? [] : this.publicFilter();
        if (q.kind)
            filters.push((0, drizzle_orm_1.eq)(schema_1.careDirectoryEntries.kind, q.kind));
        if (q.specialty)
            filters.push((0, drizzle_orm_1.sql) `${schema_1.careDirectoryEntries.details}->'specialties' @> ${JSON.stringify([q.specialty])}::jsonb`);
        if (q.search) {
            const term = `%${q.search.normalize('NFC').replace(/[%_\\]/g, '\\$&')}%`;
            filters.push((0, drizzle_orm_1.or)((0, drizzle_orm_1.ilike)(schema_1.careDirectoryEntries.name, term), (0, drizzle_orm_1.ilike)(schema_1.careDirectoryEntries.nameHi, term), (0, drizzle_orm_1.ilike)(schema_1.careDirectoryEntries.address, term), (0, drizzle_orm_1.sql) `${schema_1.careDirectoryEntries.details}->>'specialties' ilike ${term}`));
        }
        const rows = await this.database.db
            .select()
            .from(schema_1.careDirectoryEntries)
            .where((0, drizzle_orm_1.and)(...filters))
            .orderBy((0, drizzle_orm_1.asc)(schema_1.careDirectoryEntries.name), (0, drizzle_orm_1.asc)(schema_1.careDirectoryEntries.id))
            .limit(q.limit + 1)
            .offset((q.page - 1) * q.limit);
        return {
            items: rows.slice(0, q.limit).map((row) => this.present(row, admin)),
            hasNext: rows.length > q.limit,
            page: q.page,
            coverage: 'Jaipur',
        };
    }
    async detail(id, admin = false) {
        this.parse(zod_1.z.uuid(), id);
        const [row] = await this.database.db
            .select()
            .from(schema_1.careDirectoryEntries)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.careDirectoryEntries.id, id), ...(admin ? [] : this.publicFilter())))
            .limit(1);
        if (!row)
            throw new common_1.NotFoundException('This care entry is unavailable or awaiting source review.');
        const relations = await this.database.db
            .select()
            .from(schema_1.careProviderAffiliations)
            .where((0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(schema_1.careProviderAffiliations.doctorId, id), (0, drizzle_orm_1.eq)(schema_1.careProviderAffiliations.hospitalId, id)));
        const ids = relations.map((link) => (link.doctorId === id ? link.hospitalId : link.doctorId));
        const affiliated = ids.length
            ? await this.database.db
                .select()
                .from(schema_1.careDirectoryEntries)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.inArray)(schema_1.careDirectoryEntries.id, ids), ...(admin ? [] : this.publicFilter())))
            : [];
        return {
            ...this.present(row, admin),
            affiliations: affiliated.map((entry) => this.present(entry, admin)),
        };
    }
    async save(id, actor, body) {
        const { expectedUpdatedAt, ...data } = this.parse(care_directory_input_1.careInput, body);
        return this.database.db.transaction(async (tx) => {
            let result;
            if (id) {
                this.parse(zod_1.z.uuid(), id);
                if (!expectedUpdatedAt)
                    throw new common_1.BadRequestException('Reload the entry before editing.');
                const current = await tx.select().from(schema_1.careDirectoryEntries).where((0, drizzle_orm_1.eq)(schema_1.careDirectoryEntries.id, id)).limit(1);
                if (!current[0])
                    throw new common_1.NotFoundException();
                if (current[0].sourceKey !== data.sourceKey || current[0].kind !== data.kind)
                    throw new common_1.BadRequestException('Source key and kind are immutable.');
                [result] = await tx
                    .update(schema_1.careDirectoryEntries)
                    .set({
                    ...data,
                    published: false,
                    reviewedAt: null,
                    reviewedBy: null,
                    reviewEvidence: null,
                    updatedAt: new Date(),
                })
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.careDirectoryEntries.id, id), (0, drizzle_orm_1.eq)(schema_1.careDirectoryEntries.updatedAt, new Date(expectedUpdatedAt))))
                    .returning();
                if (!result)
                    throw new common_1.ConflictException('Entry changed. Reload before editing.');
            }
            else {
                [result] = await tx
                    .insert(schema_1.careDirectoryEntries)
                    .values({ ...data, updatedAt: new Date() })
                    .onConflictDoNothing({ target: schema_1.careDirectoryEntries.sourceKey })
                    .returning();
                if (!result)
                    throw new common_1.ConflictException('This source identifier already exists. Edit the existing entry.');
            }
            await tx.insert(schema_1.administrationAuditLogs).values({
                actorId: actor,
                action: 'care.save',
                targetId: result.id,
                outcome: 'succeeded',
            });
            return result;
        });
    }
    async review(id, actor, body) {
        this.parse(zod_1.z.uuid(), id);
        const review = this.parse(care_directory_input_1.reviewInput, body);
        return this.database.db.transaction(async (tx) => {
            const [row] = await tx.select().from(schema_1.careDirectoryEntries).where((0, drizzle_orm_1.eq)(schema_1.careDirectoryEntries.id, id)).for('update');
            if (!row)
                throw new common_1.NotFoundException();
            if (row.updatedAt.toISOString() !== review.expectedUpdatedAt)
                throw new common_1.ConflictException('Entry changed. Reload before reviewing.');
            if (review.publish && row.kind !== 'medicine' && (!row.address || !row.phone))
                throw new common_1.BadRequestException('A sourced address and contact number are required before publication.');
            if (review.publish &&
                row.kind === 'doctor' &&
                (!row.details.registration || !row.details.qualifications))
                throw new common_1.BadRequestException('Verify qualifications and medical registration before publishing.');
            if (review.publish &&
                row.kind === 'medicine' &&
                (!row.details.summary || !row.details.precautions))
                throw new common_1.BadRequestException('Clinically reviewed education and precautions are required.');
            const evidence = `${review.reviewerName} (${review.reviewerQualification}): ${review.evidence}`;
            const [saved] = await tx
                .update(schema_1.careDirectoryEntries)
                .set({
                published: review.publish,
                reviewedAt: new Date(),
                reviewedBy: actor,
                reviewEvidence: evidence,
                updatedAt: new Date(),
            })
                .where((0, drizzle_orm_1.eq)(schema_1.careDirectoryEntries.id, id))
                .returning();
            await tx.insert(schema_1.administrationAuditLogs).values({
                actorId: actor,
                action: review.publish ? 'care.review.publish' : 'care.withdraw',
                targetId: id,
                outcome: 'succeeded',
                metadata: { evidence, sourceUrl: row.sourceUrl },
            });
            return saved;
        });
    }
    async affiliations(id, actor, body) {
        this.parse(zod_1.z.uuid(), id);
        const data = this.parse(zod_1.z
            .object({ hospitalIds: zod_1.z.array(zod_1.z.uuid()).max(30), expectedUpdatedAt: zod_1.z.iso.datetime() })
            .strict(), body);
        return this.database.db.transaction(async (tx) => {
            const [doctor] = await tx.select().from(schema_1.careDirectoryEntries).where((0, drizzle_orm_1.eq)(schema_1.careDirectoryEntries.id, id)).for('update');
            if (doctor?.kind !== 'doctor')
                throw new common_1.BadRequestException('Choose a doctor entry.');
            if (doctor.updatedAt.toISOString() !== data.expectedUpdatedAt)
                throw new common_1.ConflictException('Doctor changed. Reload first.');
            const ids = [...new Set(data.hospitalIds)];
            const hospitals = ids.length
                ? await tx
                    .select()
                    .from(schema_1.careDirectoryEntries)
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.inArray)(schema_1.careDirectoryEntries.id, ids), (0, drizzle_orm_1.eq)(schema_1.careDirectoryEntries.kind, 'hospital')))
                : [];
            if (hospitals.length !== ids.length)
                throw new common_1.BadRequestException('Every affiliation must reference an existing hospital.');
            await tx.delete(schema_1.careProviderAffiliations).where((0, drizzle_orm_1.eq)(schema_1.careProviderAffiliations.doctorId, id));
            if (ids.length)
                await tx.insert(schema_1.careProviderAffiliations).values(ids.map((hospitalId) => ({ doctorId: id, hospitalId })));
            await tx
                .update(schema_1.careDirectoryEntries)
                .set({ published: false, reviewedAt: null, reviewedBy: null, updatedAt: new Date() })
                .where((0, drizzle_orm_1.eq)(schema_1.careDirectoryEntries.id, id));
            await tx.insert(schema_1.administrationAuditLogs).values({
                actorId: actor,
                action: 'care.affiliations',
                targetId: id,
                outcome: 'succeeded',
            });
            return { saved: true, reviewRequired: true };
        });
    }
    async report(id, body) {
        await this.detail(id);
        const data = this.parse(care_directory_input_1.correctionInput, body);
        await this.database.db.insert(schema_1.careDirectoryCorrections).values({ entryId: id, message: data.message });
        return { received: true };
    }
    async correctionQueue() {
        const care = await this.database.db
            .select()
            .from(schema_1.careDirectoryCorrections)
            .where((0, drizzle_orm_1.eq)(schema_1.careDirectoryCorrections.state, 'open'))
            .orderBy((0, drizzle_orm_1.asc)(schema_1.careDirectoryCorrections.createdAt))
            .limit(100);
        const banks = await this.database.db
            .select()
            .from(schema_1.bloodBankCorrections)
            .where((0, drizzle_orm_1.eq)(schema_1.bloodBankCorrections.state, 'open'))
            .orderBy((0, drizzle_orm_1.asc)(schema_1.bloodBankCorrections.createdAt))
            .limit(100);
        return [...care, ...banks.map((row) => ({ ...row, entryId: row.bankId, kind: 'blood-bank' }))];
    }
    async reportBank(id, body) {
        this.parse(zod_1.z.uuid(), id);
        const [bank] = await this.database.db
            .select({ id: schema_1.bloodBankDirectoryEntries.id })
            .from(schema_1.bloodBankDirectoryEntries)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.bloodBankDirectoryEntries.id, id), (0, drizzle_orm_1.eq)(schema_1.bloodBankDirectoryEntries.is_active, true), (0, drizzle_orm_1.eq)(schema_1.bloodBankDirectoryEntries.is_verified, true), (0, drizzle_orm_1.eq)(schema_1.bloodBankDirectoryEntries.city, 'Jaipur'), (0, drizzle_orm_1.gte)(schema_1.bloodBankDirectoryEntries.verified_at, new Date(Date.now() - 180 * 86400000))));
        if (!bank)
            throw new common_1.NotFoundException();
        const data = this.parse(care_directory_input_1.correctionInput, body);
        await this.database.db.insert(schema_1.bloodBankCorrections).values({ bankId: id, message: data.message });
        return { received: true };
    }
    async reviewBank(id, actor, body) {
        this.parse(zod_1.z.uuid(), id);
        const review = this.parse(care_directory_input_1.reviewInput.extend({
            sourceUrl: zod_1.z
                .url()
                .max(2000)
                .refine((value) => {
                const url = new URL(value);
                return url.protocol === 'https:' && !url.username && !url.password;
            }),
        }), body);
        return this.database.db.transaction(async (tx) => {
            const [bank] = await tx.select().from(schema_1.bloodBankDirectoryEntries).where((0, drizzle_orm_1.eq)(schema_1.bloodBankDirectoryEntries.id, id)).for('update');
            if (!bank)
                throw new common_1.NotFoundException();
            if (bank.updated_at.toISOString() !== review.expectedUpdatedAt)
                throw new common_1.ConflictException('Bank changed. Reload before reviewing.');
            if (review.publish &&
                (bank.city !== 'Jaipur' ||
                    !bank.address_en ||
                    !/^\+?\d{6,15}$/.test((bank.phone ?? '').replace(/[ ()-]/g, ''))))
                throw new common_1.BadRequestException('A sourced Jaipur address and usable phone number are required.');
            const [saved] = await tx
                .update(schema_1.bloodBankDirectoryEntries)
                .set({
                is_verified: review.publish,
                source_url: review.publish ? review.sourceUrl : null,
                verified_at: review.publish ? new Date() : null,
                updated_at: new Date(),
            })
                .where((0, drizzle_orm_1.eq)(schema_1.bloodBankDirectoryEntries.id, id))
                .returning();
            await tx
                .insert(schema_1.administrationAuditLogs)
                .values({
                actorId: actor,
                action: review.publish ? 'blood-bank.review.publish' : 'blood-bank.withdraw',
                targetId: id,
                outcome: 'succeeded',
                metadata: {
                    sourceUrl: review.sourceUrl,
                    reviewer: review.reviewerName,
                    qualification: review.reviewerQualification,
                    evidence: review.evidence,
                },
            });
            return saved;
        });
    }
    async resolve(id, actor, body) {
        this.parse(zod_1.z.uuid(), id);
        const data = this.parse(zod_1.z.object({ resolution: zod_1.z.string().trim().min(10).max(2000) }).strict(), body);
        return this.database.db.transaction(async (tx) => {
            const [row] = await tx
                .update(schema_1.careDirectoryCorrections)
                .set({ ...data, resolvedBy: actor, state: 'resolved' })
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.careDirectoryCorrections.id, id), (0, drizzle_orm_1.eq)(schema_1.careDirectoryCorrections.state, 'open')))
                .returning();
            if (!row) {
                const bankRows = await tx
                    .update(schema_1.bloodBankCorrections)
                    .set({ ...data, resolvedBy: actor, state: 'resolved' })
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.bloodBankCorrections.id, id), (0, drizzle_orm_1.eq)(schema_1.bloodBankCorrections.state, 'open')))
                    .returning();
                if (!bankRows.length)
                    throw new common_1.NotFoundException();
            }
            await tx.insert(schema_1.administrationAuditLogs).values({
                actorId: actor,
                action: 'care.correction.resolve',
                targetId: id,
                outcome: 'succeeded',
            });
            return { resolved: true };
        });
    }
};
exports.CareDirectoryService = CareDirectoryService;
exports.CareDirectoryService = CareDirectoryService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.DatabaseService])
], CareDirectoryService);
//# sourceMappingURL=care-directory.service.js.map