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
exports.HospitalsService = void 0;
const admin_status_1 = require("../../../common/directory/admin-status");
const provider_image_1 = require("../../../common/media/provider-image");
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const node_crypto_1 = require("node:crypto");
const drizzle_orm_1 = require("drizzle-orm");
const zod_1 = require("zod");
const database_service_1 = require("../../../database/database.service");
const schema_1 = require("../../../database/schema");
const database_error_1 = require("../../../common/errors/database-error");
const hospitals_input_1 = require("../requests/hospitals.input");
const hospitals_import_1 = require("../imports/hospitals.import");
const lock = (0, drizzle_orm_1.sql) `select pg_advisory_xact_lock(6389023)`;
const hash = (value) => (0, node_crypto_1.createHash)('sha256').update(value).digest('hex');
const { image_data: binaryImage, ...profileColumns } = (0, drizzle_orm_1.getTableColumns)(schema_1.hospitals);
void binaryImage;
const fields = {
    ...profileColumns,
    image_url: (0, drizzle_orm_1.sql) `case when ${schema_1.hospitals.image_revision} is null then null else '/api/v1/public/hospitals/' || ${schema_1.hospitals.id} || '/image?v=' || ${schema_1.hospitals.image_revision} end`,
    published: schema_1.careDirectoryEntries.published,
    reviewedAt: schema_1.careDirectoryEntries.reviewedAt,
    reviewedBy: schema_1.careDirectoryEntries.reviewedBy,
    reviewEvidence: schema_1.careDirectoryEntries.reviewEvidence,
};
let HospitalsService = class HospitalsService {
    database;
    config;
    constructor(database, config) {
        this.database = database;
        this.config = config;
    }
    parse(schema, value) {
        const result = schema.safeParse(value);
        if (!result.success)
            throw new common_1.BadRequestException(result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; '));
        return result.data;
    }
    visible() {
        return (0, drizzle_orm_1.eq)(schema_1.hospitals.listed, true);
    }
    present(row, admin) {
        return admin ? row : { ...row, reviewedBy: undefined, reviewEvidence: undefined };
    }
    async list(query, admin = false) {
        const q = this.parse(admin ? hospitals_input_1.hospitalAdminQuery : hospitals_input_1.hospitalQuery, query), conditions = [];
        if (!admin)
            conditions.push(this.visible());
        if (q.city)
            conditions.push((0, drizzle_orm_1.sql) `lower(btrim(${schema_1.hospitals.city}))=${q.city.toLowerCase()}`);
        if (q.state)
            conditions.push((0, drizzle_orm_1.sql) `lower(btrim(${schema_1.hospitals.state}))=${q.state.toLowerCase()}`);
        if (q.type)
            conditions.push((0, drizzle_orm_1.sql) `lower(${schema_1.hospitals.hospital_type})=${q.type.toLowerCase()}`);
        const benefits = {
            ayushman: schema_1.hospitals.accepts_ayushman,
            janaadhaar: schema_1.hospitals.accepts_janaadhaar,
            cghs: schema_1.hospitals.accepts_cghs,
            esic: schema_1.hospitals.accepts_esic,
            rgahs: schema_1.hospitals.rgahs_approved,
            cashless: schema_1.hospitals.is_cashless,
            nabh: schema_1.hospitals.nabh_accredited,
        };
        if (q.benefit)
            conditions.push((0, drizzle_orm_1.eq)(benefits[q.benefit], true));
        if (q.search) {
            const term = `%${q.search.replace(/[\\%_]/g, '\\$&')}%`;
            conditions.push((0, drizzle_orm_1.or)((0, drizzle_orm_1.ilike)(schema_1.hospitals.name_en, term), (0, drizzle_orm_1.ilike)(schema_1.hospitals.name_hi, term), (0, drizzle_orm_1.ilike)(schema_1.hospitals.address_line1, term), (0, drizzle_orm_1.ilike)(schema_1.hospitals.city, term), (0, drizzle_orm_1.ilike)(schema_1.hospitals.landmark, term)));
        }
        const baseWhere = (0, drizzle_orm_1.and)(...conditions), statusPredicates = (0, admin_status_1.directoryPredicates)('hospitals');
        const status = admin_status_1.directoryStatusInput.parse('status' in q ? q.status : 'all');
        if (admin && status !== 'all')
            conditions.push(status === 'published' ? (0, drizzle_orm_1.sql) `${schema_1.careDirectoryEntries.published}=true` : statusPredicates[status]);
        const summary = admin ? (await this.database.db.select((0, admin_status_1.directoryCountFields)(statusPredicates)).from(schema_1.hospitals).innerJoin(schema_1.careDirectoryEntries, (0, drizzle_orm_1.eq)(schema_1.careDirectoryEntries.id, schema_1.hospitals.id)).where(baseWhere))[0] : undefined;
        const where = (0, drizzle_orm_1.and)(...conditions), [items, total] = await Promise.all([
            this.database.db
                .select(fields)
                .from(schema_1.hospitals)
                .innerJoin(schema_1.careDirectoryEntries, (0, drizzle_orm_1.eq)(schema_1.careDirectoryEntries.id, schema_1.hospitals.id))
                .where(where)
                .orderBy((0, drizzle_orm_1.asc)(q.language === 'hi'
                ? (0, drizzle_orm_1.sql) `coalesce(nullif(${schema_1.hospitals.name_hi},''),${schema_1.hospitals.name_en})`
                : (0, drizzle_orm_1.sql) `lower(${schema_1.hospitals.name_en})`), (0, drizzle_orm_1.asc)(schema_1.hospitals.id))
                .limit(q.limit)
                .offset((q.page - 1) * q.limit),
            this.database.db
                .select({ count: (0, drizzle_orm_1.count)() })
                .from(schema_1.hospitals)
                .innerJoin(schema_1.careDirectoryEntries, (0, drizzle_orm_1.eq)(schema_1.careDirectoryEntries.id, schema_1.hospitals.id))
                .where(where),
        ]);
        return {
            items: items.map((row) => ({ ...this.present(row, admin), ...(admin ? { adminStatus: (0, admin_status_1.directoryRowStatus)('hospitals', row) } : {}) })),
            ...(admin ? { summary } : {}),
            total: total[0].count,
            page: q.page,
            hasNext: q.page * q.limit < total[0].count,
        };
    }
    async detail(id, admin = false) {
        this.parse(zod_1.z.uuid(), id);
        const [row] = await this.database.db
            .select(fields)
            .from(schema_1.hospitals)
            .innerJoin(schema_1.careDirectoryEntries, (0, drizzle_orm_1.eq)(schema_1.careDirectoryEntries.id, schema_1.hospitals.id))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.hospitals.id, id), admin ? undefined : this.visible()))
            .limit(1);
        if (!row)
            throw new common_1.NotFoundException('Hospital not found or hidden from the directory.');
        return this.present(row, admin);
    }
    async write(operation) {
        try {
            return await this.database.db.transaction(async (tx) => {
                await tx.execute(lock);
                return operation(tx);
            });
        }
        catch (error) {
            if ((0, database_error_1.isUniqueViolation)(error))
                throw new common_1.ConflictException('This source key already exists. Use its existing record.');
            if ((0, database_error_1.getDatabaseErrorCode)(error) === '23503')
                throw new common_1.ConflictException('Hospital has linked records. Withdraw it instead of deleting.');
            throw error;
        }
    }
    async audit(tx, actorId, action, targetId, metadata = {}) {
        await tx
            .insert(schema_1.administrationAuditLogs)
            .values({ actorId, action: `hospitals.${action}`, targetId, outcome: 'succeeded', metadata });
    }
    projection(value) {
        return {
            sourceKey: value.source_key,
            kind: 'hospital',
            name: value.name_en,
            nameHi: value.name_hi,
            city: value.city,
            address: [
                value.address_line1,
                value.address_line2,
                value.landmark,
                value.city,
                value.state,
                value.pincode,
            ]
                .filter(Boolean)
                .join(', '),
            addressHi: value.address_hi,
            phone: (0, hospitals_input_1.hospitalPhone)(value.country_code_1, value.phone_1),
            sourceUrl: value.source_url ?? '',
            details: {
                specialties: value.specialties,
                qualifications: '',
                registration: '',
                languages: [],
                providerType: value.hospital_type,
                summary: value.summary_en,
                precautions: '',
                latitude: value.latitude,
                longitude: value.longitude,
            },
            published: false,
            reviewedAt: null,
            reviewedBy: null,
            reviewEvidence: null,
            updatedAt: new Date(),
        };
    }
    data(row) {
        return Object.fromEntries(hospitals_import_1.hospitalHeaders.map((key) => [key, row[key]]));
    }
    async insert(tx, value) {
        const id = (0, node_crypto_1.randomUUID)();
        await tx.insert(schema_1.careDirectoryEntries).values({ id, ...this.projection(value) });
        const [row] = await tx
            .insert(schema_1.hospitals)
            .values({ id, ...value })
            .returning();
        return row;
    }
    async change(tx, row, value) {
        const [saved] = await tx
            .update(schema_1.hospitals)
            .set({ ...value, version: row.version + 1, updated_at: new Date() })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.hospitals.id, row.id), (0, drizzle_orm_1.eq)(schema_1.hospitals.version, row.version)))
            .returning();
        if (!saved)
            throw new common_1.ConflictException('Hospital changed. Reload first.');
        await tx.update(schema_1.careDirectoryEntries).set(this.projection(value)).where((0, drizzle_orm_1.eq)(schema_1.careDirectoryEntries.id, row.id));
        return saved;
    }
    create(actor, body) {
        const value = this.parse(hospitals_input_1.hospitalInput, body);
        return this.write(async (tx) => {
            const row = await this.insert(tx, value);
            await this.audit(tx, actor, 'create', row.id);
            return { ...(0, provider_image_1.omitProviderImage)(row), published: false };
        });
    }
    update(actor, id, body) {
        this.parse(zod_1.z.uuid(), id);
        const { expectedVersion, ...changes } = this.parse(hospitals_input_1.hospitalUpdate, body);
        return this.write(async (tx) => {
            const [row] = await tx.select().from(schema_1.hospitals).where((0, drizzle_orm_1.eq)(schema_1.hospitals.id, id));
            if (!row || row.version !== expectedVersion)
                throw new common_1.ConflictException('Hospital changed or was removed. Reload first.');
            const value = this.parse(hospitals_input_1.hospitalInput, { ...this.data(row), ...changes });
            const saved = await this.change(tx, row, value);
            await this.audit(tx, actor, 'update', id);
            return { ...(0, provider_image_1.omitProviderImage)(saved), published: false, reviewRequired: true };
        });
    }
    review(actor, id, body) {
        this.parse(zod_1.z.uuid(), id);
        const value = this.parse(hospitals_input_1.hospitalReview, body);
        return this.write(async (tx) => {
            const [row] = await tx.select().from(schema_1.hospitals).where((0, drizzle_orm_1.eq)(schema_1.hospitals.id, id));
            if (!row || row.version !== value.expectedVersion)
                throw new common_1.ConflictException('Hospital changed. Reload before reviewing.');
            if (value.publish && (!row.source_url || !row.address_line1 || !row.phone_1))
                throw new common_1.BadRequestException('A sourced address, primary contact and HTTPS evidence URL are required before publication.');
            await tx
                .update(schema_1.careDirectoryEntries)
                .set({
                published: value.publish,
                reviewedAt: new Date(),
                reviewedBy: actor,
                reviewEvidence: `${value.reviewerName} (${value.reviewerQualification}): ${value.evidence}`,
                updatedAt: new Date(),
            })
                .where((0, drizzle_orm_1.eq)(schema_1.careDirectoryEntries.id, id));
            const [saved] = await tx
                .update(schema_1.hospitals)
                .set({ version: row.version + 1, updated_at: new Date(), ...(value.publish ? { listed: true } : { listed: false }) })
                .where((0, drizzle_orm_1.eq)(schema_1.hospitals.id, id))
                .returning();
            await this.audit(tx, actor, value.publish ? 'publish' : 'withdraw', id);
            return { ...(0, provider_image_1.omitProviderImage)(saved), published: value.publish };
        });
    }
    visibility(actor, id, body) {
        this.parse(zod_1.z.uuid(), id);
        const value = this.parse(zod_1.z.object({ listed: zod_1.z.boolean(), expectedVersion: zod_1.z.number().int().positive() }).strict(), body);
        return this.write(async (tx) => {
            const [row] = await tx.select().from(schema_1.hospitals).where((0, drizzle_orm_1.eq)(schema_1.hospitals.id, id));
            if (!row || row.version !== value.expectedVersion)
                throw new common_1.ConflictException('Hospital changed. Reload first.');
            const [saved] = await tx.update(schema_1.hospitals).set({ listed: value.listed, version: row.version + 1, updated_at: new Date() }).where((0, drizzle_orm_1.eq)(schema_1.hospitals.id, id)).returning();
            await this.audit(tx, actor, value.listed ? 'list' : 'hide', id);
            return (0, provider_image_1.omitProviderImage)(saved);
        });
    }
    remove(actor, id, query) {
        this.parse(zod_1.z.uuid(), id);
        const { expected_version } = this.parse(hospitals_input_1.hospitalDelete, query);
        return this.write(async (tx) => {
            const [row] = await tx.select().from(schema_1.hospitals).where((0, drizzle_orm_1.eq)(schema_1.hospitals.id, id));
            if (!row || row.version !== expected_version)
                throw new common_1.ConflictException('Hospital changed or was removed. Reload first.');
            await tx.delete(schema_1.careDirectoryEntries).where((0, drizzle_orm_1.eq)(schema_1.careDirectoryEntries.id, id));
            await this.audit(tx, actor, 'delete', id);
            return { deleted: true };
        });
    }
    async prepared(file) {
        try {
            return await (0, hospitals_import_1.prepareHospitals)(file);
        }
        catch (error) {
            throw new common_1.BadRequestException(error instanceof Error ? error.message : 'Invalid hospital file.');
        }
    }
    async current(tx) {
        return tx
            .select(fields)
            .from(schema_1.hospitals)
            .innerJoin(schema_1.careDirectoryEntries, (0, drizzle_orm_1.eq)(schema_1.careDirectoryEntries.id, schema_1.hospitals.id))
            .orderBy((0, drizzle_orm_1.asc)(schema_1.hospitals.id));
    }
    async plan(prepared, existing, tx) {
        const keys = new Map(existing.map((row) => [row.source_key, row])), errors = [...prepared.errors];
        const sourceKeys = prepared.rows.map((row) => row.value.source_key), collisions = sourceKeys.length
            ? await tx
                .select({ key: schema_1.careDirectoryEntries.sourceKey })
                .from(schema_1.careDirectoryEntries)
                .where((0, drizzle_orm_1.inArray)(schema_1.careDirectoryEntries.sourceKey, sourceKeys))
            : [];
        const unavailable = new Set(collisions.filter((row) => !keys.has(row.key)).map((row) => row.key));
        for (const row of prepared.rows)
            if (unavailable.has(row.value.source_key))
                errors.push({
                    row: row.row,
                    message: 'Source key belongs to a legacy or other care record. Resolve its identity before import.',
                });
        const updates = prepared.rows.filter((row) => keys.has(row.value.source_key)).length;
        return {
            totalRows: prepared.totalRows,
            creates: prepared.rows.length - updates,
            updates,
            returnsToDraft: prepared.rows.filter((row) => keys.get(row.value.source_key)?.published)
                .length,
            errorCount: errors.length,
            errors,
            ignoredVerificationFlags: prepared.ignoredVerificationFlags,
            sample: prepared.rows.slice(0, 10).map((row) => ({
                source_key: row.value.source_key,
                name_en: row.value.name_en,
                city: row.value.city,
                state: row.value.state,
            })),
        };
    }
    sign(value) {
        return (0, node_crypto_1.createHmac)('sha256', this.config.getOrThrow('JWT_ACCESS_SECRET'))
            .update('hospitals-import-v1:' + value)
            .digest('base64url');
    }
    async preview(actor, file) {
        const prepared = await this.prepared(file), existing = await this.current(this.database.db), plan = await this.plan(prepared, existing, this.database.db), expiresAt = Date.now() + 600000, payload = Buffer.from(JSON.stringify({
            actor,
            hash: hash(file.buffer),
            state: hash(JSON.stringify(existing)),
            expiresAt,
        })).toString('base64url');
        return {
            ...plan,
            expiresAt: new Date(expiresAt).toISOString(),
            previewToken: plan.errorCount ? null : payload + '.' + this.sign(payload),
        };
    }
    async apply(actor, file, token) {
        const prepared = await this.prepared(file), [payload, signature, ...rest] = this.parse(zod_1.z.string().min(1).max(4096), token).split('.');
        const expected = Buffer.from(this.sign(payload ?? '')), provided = Buffer.from(signature ?? '');
        if (rest.length || expected.length !== provided.length || !(0, node_crypto_1.timingSafeEqual)(expected, provided))
            throw new common_1.BadRequestException('Invalid import preview. Preview again.');
        let authorization;
        try {
            authorization = zod_1.z
                .object({ actor: zod_1.z.string(), hash: zod_1.z.string(), state: zod_1.z.string(), expiresAt: zod_1.z.number() })
                .parse(JSON.parse(Buffer.from(payload, 'base64url').toString()));
        }
        catch {
            throw new common_1.BadRequestException('Invalid import preview.');
        }
        if (authorization.actor !== actor ||
            authorization.hash !== hash(file.buffer) ||
            authorization.expiresAt <= Date.now())
            throw new common_1.ConflictException('File, administrator or preview expiry changed. Preview again.');
        return this.write(async (tx) => {
            const existing = await this.current(tx);
            if (hash(JSON.stringify(existing)) !== authorization.state)
                throw new common_1.ConflictException('Hospitals changed after preview. Preview again.');
            const plan = await this.plan(prepared, existing, tx);
            if (plan.errorCount)
                throw new common_1.BadRequestException({
                    message: 'Fix all import errors before applying.',
                    errors: plan.errors,
                });
            const keys = new Map(existing.map((row) => [row.source_key, row]));
            for (const { value } of prepared.rows) {
                const row = keys.get(value.source_key);
                if (row)
                    await this.change(tx, row, value);
                else
                    await this.insert(tx, value);
            }
            await this.audit(tx, actor, 'import', null, {
                rows: plan.totalRows,
                creates: plan.creates,
                updates: plan.updates,
            });
            return {
                imported: plan.totalRows,
                creates: plan.creates,
                updates: plan.updates,
                reviewRequired: true,
            };
        });
    }
    async image(id, admin = false) {
        this.parse(zod_1.z.uuid(), id);
        const [row] = await this.database.db
            .select({ image_data: schema_1.hospitals.image_data, image_revision: schema_1.hospitals.image_revision })
            .from(schema_1.hospitals)
            .innerJoin(schema_1.careDirectoryEntries, (0, drizzle_orm_1.eq)(schema_1.careDirectoryEntries.id, schema_1.hospitals.id))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.hospitals.id, id), admin ? undefined : this.visible()))
            .limit(1);
        if (!row?.image_data)
            throw new common_1.NotFoundException('Image not found.');
        return row;
    }
    async uploadImage(actor, id, file, body) {
        this.parse(zod_1.z.uuid(), id);
        const input = this.parse(provider_image_1.providerImageInput, body), image = await (0, provider_image_1.decodeProviderImage)(file);
        return this.write(async (tx) => {
            const [existing] = await tx
                .select({ version: schema_1.hospitals.version })
                .from(schema_1.hospitals)
                .where((0, drizzle_orm_1.eq)(schema_1.hospitals.id, id));
            if (!existing || existing.version !== input.expectedVersion)
                throw new common_1.ConflictException('Record changed. Reload before uploading.');
            const revision = (0, node_crypto_1.randomUUID)();
            await tx
                .update(schema_1.hospitals)
                .set({
                image_data: image,
                image_alt: input.alt,
                image_revision: revision,
                version: existing.version + 1,
                updated_at: new Date(),
            })
                .where((0, drizzle_orm_1.eq)(schema_1.hospitals.id, id));
            await tx
                .update(schema_1.careDirectoryEntries)
                .set({
                imageUrl: `/api/v1/public/hospitals/${id}/image?v=${revision}`,
                imageAlt: input.alt,
                published: false,
                reviewedAt: null,
                reviewedBy: null,
                reviewEvidence: null,
                updatedAt: new Date(),
            })
                .where((0, drizzle_orm_1.eq)(schema_1.careDirectoryEntries.id, id));
            await this.audit(tx, actor, 'image.upload', id, { bytes: image.length });
            return {
                version: existing.version + 1,
                image_url: `/api/v1/public/hospitals/${id}/image?v=${revision}`,
                image_alt: input.alt,
                published: false,
                reviewRequired: true,
            };
        });
    }
    removeImage(actor, id, query) {
        this.parse(zod_1.z.uuid(), id);
        const { expected_version } = this.parse(hospitals_input_1.hospitalDelete, query);
        return this.write(async (tx) => {
            const [existing] = await tx
                .select({ version: schema_1.hospitals.version })
                .from(schema_1.hospitals)
                .where((0, drizzle_orm_1.eq)(schema_1.hospitals.id, id));
            if (!existing || existing.version !== expected_version)
                throw new common_1.ConflictException('Record changed. Reload before removing the image.');
            await tx
                .update(schema_1.hospitals)
                .set({
                image_data: null,
                image_alt: '',
                image_revision: null,
                version: existing.version + 1,
                updated_at: new Date(),
            })
                .where((0, drizzle_orm_1.eq)(schema_1.hospitals.id, id));
            await tx
                .update(schema_1.careDirectoryEntries)
                .set({
                imageUrl: null,
                imageAlt: '',
                published: false,
                reviewedAt: null,
                reviewedBy: null,
                reviewEvidence: null,
                updatedAt: new Date(),
            })
                .where((0, drizzle_orm_1.eq)(schema_1.careDirectoryEntries.id, id));
            await this.audit(tx, actor, 'image.remove', id);
            return {
                version: existing.version + 1,
                removed: true,
                published: false,
                reviewRequired: true,
            };
        });
    }
};
exports.HospitalsService = HospitalsService;
exports.HospitalsService = HospitalsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.DatabaseService,
        config_1.ConfigService])
], HospitalsService);
//# sourceMappingURL=hospitals.service.js.map