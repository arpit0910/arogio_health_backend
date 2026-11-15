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
exports.DiseasesService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const node_crypto_1 = require("node:crypto");
const drizzle_orm_1 = require("drizzle-orm");
const zod_1 = require("zod");
const database_service_1 = require("../../../database/database.service");
const schema_1 = require("../../../database/schema");
const database_error_1 = require("../../../common/errors/database-error");
const diseases_input_1 = require("../requests/diseases.input");
const diseases_import_1 = require("../imports/diseases.import");
const lock = (0, drizzle_orm_1.sql) `select pg_advisory_xact_lock(6389024)`;
const hash = (value) => (0, node_crypto_1.createHash)('sha256').update(value).digest('hex');
let DiseasesService = class DiseasesService {
    database;
    config;
    constructor(database, config) {
        this.database = database;
        this.config = config;
    }
    parse(schema, value) {
        const parsed = schema.safeParse(value);
        if (!parsed.success)
            throw new common_1.BadRequestException(parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; '));
        return parsed.data;
    }
    async list(query, admin = false) {
        const q = this.parse(admin ? diseases_input_1.diseaseAdminQuery : diseases_input_1.diseaseQuery, query);
        const conditions = [];
        if (!admin)
            conditions.push((0, drizzle_orm_1.eq)(schema_1.medicalDiseases.is_active, true), (0, drizzle_orm_1.eq)(schema_1.medicalDepartments.is_active, true));
        if (q.department_id)
            conditions.push((0, drizzle_orm_1.eq)(schema_1.medicalDiseases.department_id, q.department_id));
        else if ('status' in q && q.status !== 'all')
            conditions.push((0, drizzle_orm_1.eq)(schema_1.medicalDiseases.is_active, q.status === 'active'));
        if (q.search) {
            const term = `%${q.search.replace(/[\\%_]/g, '\\$&')}%`;
            conditions.push((0, drizzle_orm_1.or)((0, drizzle_orm_1.ilike)(schema_1.medicalDiseases.name_en, term), (0, drizzle_orm_1.ilike)(schema_1.medicalDiseases.name_hi, term), (0, drizzle_orm_1.ilike)(schema_1.medicalDiseases.description_en, term), (0, drizzle_orm_1.ilike)(schema_1.medicalDiseases.description_hi, term)));
        }
        const where = (0, drizzle_orm_1.and)(...conditions);
        const [items, totals] = await Promise.all([
            this.database.db
                .select({
                ...(0, drizzle_orm_1.getTableColumns)(schema_1.medicalDiseases),
                department: {
                    id: schema_1.medicalDepartments.id,
                    name_en: schema_1.medicalDepartments.name_en,
                    name_hi: schema_1.medicalDepartments.name_hi,
                    is_active: schema_1.medicalDepartments.is_active,
                },
            })
                .from(schema_1.medicalDiseases)
                .innerJoin(schema_1.medicalDepartments, (0, drizzle_orm_1.eq)(schema_1.medicalDepartments.id, schema_1.medicalDiseases.department_id))
                .where(where)
                .orderBy((0, drizzle_orm_1.asc)(q.language === 'hi'
                ? (0, drizzle_orm_1.sql) `coalesce(nullif(${schema_1.medicalDiseases.name_hi}, ''), ${schema_1.medicalDiseases.name_en})`
                : (0, drizzle_orm_1.sql) `lower(${schema_1.medicalDiseases.name_en})`), (0, drizzle_orm_1.asc)(schema_1.medicalDiseases.id))
                .limit(q.limit)
                .offset((q.page - 1) * q.limit),
            this.database.db
                .select({ count: (0, drizzle_orm_1.count)() })
                .from(schema_1.medicalDiseases)
                .innerJoin(schema_1.medicalDepartments, (0, drizzle_orm_1.eq)(schema_1.medicalDepartments.id, schema_1.medicalDiseases.department_id))
                .where(where),
        ]);
        return {
            items,
            total: totals[0].count,
            page: q.page,
            hasNext: q.page * q.limit < totals[0].count,
        };
    }
    async detail(id, admin = false) {
        this.parse(zod_1.z.uuid(), id);
        const [row] = await this.database.db
            .select({
            ...(0, drizzle_orm_1.getTableColumns)(schema_1.medicalDiseases),
            department: {
                id: schema_1.medicalDepartments.id,
                name_en: schema_1.medicalDepartments.name_en,
                name_hi: schema_1.medicalDepartments.name_hi,
                is_active: schema_1.medicalDepartments.is_active,
            },
        })
            .from(schema_1.medicalDiseases)
            .innerJoin(schema_1.medicalDepartments, (0, drizzle_orm_1.eq)(schema_1.medicalDepartments.id, schema_1.medicalDiseases.department_id))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.medicalDiseases.id, id), admin ? undefined : (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.medicalDiseases.is_active, true), (0, drizzle_orm_1.eq)(schema_1.medicalDepartments.is_active, true))))
            .limit(1);
        if (!row)
            throw new common_1.NotFoundException('Disease not found.');
        return row;
    }
    async audit(tx, actorId, action, targetId, metadata = {}) {
        await tx.insert(schema_1.administrationAuditLogs).values({
            actorId,
            action: `diseases.${action}`,
            targetId,
            outcome: 'succeeded',
            metadata,
        });
    }
    async write(operation) {
        try {
            return await this.database.db.transaction(async (tx) => {
                await tx.execute((0, drizzle_orm_1.sql) `select pg_advisory_xact_lock(6389022)`);
                await tx.execute(lock);
                return operation(tx);
            });
        }
        catch (error) {
            if ((0, database_error_1.isUniqueViolation)(error))
                throw new common_1.ConflictException('A disease already uses this source key or English name.');
            if ((0, database_error_1.getDatabaseErrorCode)(error) === '23503')
                throw new common_1.ConflictException('This disease is still referenced. Deactivate it instead.');
            throw error;
        }
    }
    create(actorId, body) {
        const input = this.parse(diseases_input_1.diseaseInput, body);
        return this.write(async (tx) => {
            const [department] = await tx
                .select({ id: schema_1.medicalDepartments.id })
                .from(schema_1.medicalDepartments)
                .where((0, drizzle_orm_1.eq)(schema_1.medicalDepartments.id, input.department_id));
            if (!department)
                throw new common_1.BadRequestException('Choose an existing medical department.');
            const [row] = await tx.insert(schema_1.medicalDiseases).values(input).returning();
            await this.audit(tx, actorId, 'create', row.id);
            return row;
        });
    }
    update(actorId, id, body) {
        this.parse(zod_1.z.uuid(), id);
        const { expectedVersion, ...changes } = this.parse(diseases_input_1.diseaseUpdate, body);
        return this.write(async (tx) => {
            if (changes.department_id) {
                const [department] = await tx
                    .select({ id: schema_1.medicalDepartments.id })
                    .from(schema_1.medicalDepartments)
                    .where((0, drizzle_orm_1.eq)(schema_1.medicalDepartments.id, changes.department_id));
                if (!department)
                    throw new common_1.BadRequestException('Choose an existing medical department.');
            }
            const [row] = await tx
                .update(schema_1.medicalDiseases)
                .set({ ...changes, updated_at: new Date(), version: (0, drizzle_orm_1.sql) `${schema_1.medicalDiseases.version} + 1` })
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.medicalDiseases.id, id), (0, drizzle_orm_1.eq)(schema_1.medicalDiseases.version, expectedVersion)))
                .returning();
            if (!row)
                throw new common_1.ConflictException('Disease changed or was removed. Reload it before editing.');
            await this.audit(tx, actorId, 'update', id);
            return row;
        });
    }
    remove(actorId, id, query) {
        this.parse(zod_1.z.uuid(), id);
        const { expected_version } = this.parse(diseases_input_1.diseaseDelete, query);
        return this.write(async (tx) => {
            const rows = await tx
                .delete(schema_1.medicalDiseases)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.medicalDiseases.id, id), (0, drizzle_orm_1.eq)(schema_1.medicalDiseases.version, expected_version)))
                .returning({ id: schema_1.medicalDiseases.id });
            if (!rows.length)
                throw new common_1.ConflictException('Disease changed or was removed. Reload it before deleting.');
            await this.audit(tx, actorId, 'delete', id);
            return { deleted: true };
        });
    }
    async prepared(file, masters) {
        try {
            return await (0, diseases_import_1.prepareDiseases)(file, masters);
        }
        catch (error) {
            throw new common_1.BadRequestException(error instanceof Error ? error.message : 'Invalid import file.');
        }
    }
    plan(prepared, existing) {
        const errors = [...prepared.errors], keys = new Map(existing.map((row) => [row.source_key, row])), names = new Map(existing.map((row) => [row.name_en.trim().toLowerCase(), row.source_key]));
        let creates = 0, updates = 0;
        for (const { row, value } of prepared.rows) {
            const owner = names.get(value.name_en.toLowerCase());
            if (owner && owner !== value.source_key)
                errors.push({
                    row,
                    message: 'English name belongs to a different source key. Correct the identity before importing.',
                });
            if (keys.has(value.source_key))
                updates++;
            else
                creates++;
        }
        return {
            totalRows: prepared.totalRows,
            creates,
            updates,
            activeRows: prepared.rows.filter((row) => row.value.is_active).length,
            errorCount: errors.length,
            errors,
            sample: prepared.rows.slice(0, 10).map((row) => row.value),
        };
    }
    sign(payload) {
        return (0, node_crypto_1.createHmac)('sha256', this.config.getOrThrow('JWT_ACCESS_SECRET'))
            .update('diseases-import-v1:' + payload)
            .digest('base64url');
    }
    async preview(actorId, file) {
        const masters = await this.database.db.select().from(schema_1.medicalDepartments).orderBy((0, drizzle_orm_1.asc)(schema_1.medicalDepartments.id));
        const prepared = await this.prepared(file, masters);
        const existing = await this.database.db.select().from(schema_1.medicalDiseases).orderBy((0, drizzle_orm_1.asc)(schema_1.medicalDiseases.id));
        const plan = this.plan(prepared, existing);
        const expiresAt = Date.now() + 10 * 60 * 1000;
        const payload = Buffer.from(JSON.stringify({
            actorId,
            hash: hash(file.buffer),
            state: hash(JSON.stringify({ existing, masters })),
            expiresAt,
        })).toString('base64url');
        return {
            ...plan,
            expiresAt: new Date(expiresAt).toISOString(),
            previewToken: plan.errorCount ? null : payload + '.' + this.sign(payload),
        };
    }
    async apply(actorId, file, token) {
        const masters = await this.database.db.select().from(schema_1.medicalDepartments).orderBy((0, drizzle_orm_1.asc)(schema_1.medicalDepartments.id));
        const prepared = await this.prepared(file, masters);
        const raw = this.parse(zod_1.z.string().min(1).max(4096), token), parts = raw.split('.');
        if (parts.length !== 2)
            throw new common_1.BadRequestException('Preview this file before applying.');
        const signature = Buffer.from(this.sign(parts[0])), received = Buffer.from(parts[1]);
        if (signature.length !== received.length || !(0, node_crypto_1.timingSafeEqual)(signature, received))
            throw new common_1.BadRequestException('Import preview is invalid. Preview again.');
        let authorization;
        try {
            authorization = zod_1.z
                .object({ actorId: zod_1.z.string(), hash: zod_1.z.string(), state: zod_1.z.string(), expiresAt: zod_1.z.number() })
                .parse(JSON.parse(Buffer.from(parts[0], 'base64url').toString()));
        }
        catch {
            throw new common_1.BadRequestException('Import preview is invalid. Preview again.');
        }
        if (authorization.actorId !== actorId ||
            authorization.hash !== hash(file.buffer) ||
            authorization.expiresAt <= Date.now())
            throw new common_1.ConflictException('File, administrator or preview expiry changed. Preview again.');
        return this.write(async (tx) => {
            const existing = await tx.select().from(schema_1.medicalDiseases).orderBy((0, drizzle_orm_1.asc)(schema_1.medicalDiseases.id));
            const currentMasters = await tx.select().from(schema_1.medicalDepartments).orderBy((0, drizzle_orm_1.asc)(schema_1.medicalDepartments.id));
            if (hash(JSON.stringify({ existing, masters: currentMasters })) !== authorization.state)
                throw new common_1.ConflictException('Diseases changed after preview. Preview again.');
            const plan = this.plan(prepared, existing);
            if (plan.errorCount)
                throw new common_1.BadRequestException({
                    message: 'Fix all import errors before applying.',
                    errors: plan.errors,
                });
            for (const { value } of prepared.rows)
                await tx
                    .insert(schema_1.medicalDiseases)
                    .values(value)
                    .onConflictDoUpdate({
                    target: schema_1.medicalDiseases.source_key,
                    set: { ...value, version: (0, drizzle_orm_1.sql) `${schema_1.medicalDiseases.version} + 1`, updated_at: new Date() },
                });
            await this.audit(tx, actorId, 'import', null, {
                creates: plan.creates,
                updates: plan.updates,
                rows: plan.totalRows,
            });
            return { imported: plan.totalRows, creates: plan.creates, updates: plan.updates };
        });
    }
};
exports.DiseasesService = DiseasesService;
exports.DiseasesService = DiseasesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.DatabaseService,
        config_1.ConfigService])
], DiseasesService);
//# sourceMappingURL=diseases.service.js.map