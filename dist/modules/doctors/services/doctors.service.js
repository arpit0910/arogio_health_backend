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
exports.DoctorsService = void 0;
const provider_image_1 = require("../../../common/media/provider-image");
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const node_crypto_1 = require("node:crypto");
const drizzle_orm_1 = require("drizzle-orm");
const zod_1 = require("zod");
const database_service_1 = require("../../../database/database.service");
const schema_1 = require("../../../database/schema");
const database_error_1 = require("../../../common/errors/database-error");
const doctors_input_1 = require("../requests/doctors.input");
const hospitals_input_1 = require("../../hospitals/requests/hospitals.input");
const doctors_import_1 = require("../imports/doctors.import");
const lock = (0, drizzle_orm_1.sql) `select pg_advisory_xact_lock(6389025)`;
const hash = (value) => (0, node_crypto_1.createHash)('sha256').update(value).digest('hex');
const { image_data: binaryImage, ...profileColumns } = (0, drizzle_orm_1.getTableColumns)(schema_1.doctors);
void binaryImage;
const fields = {
    ...profileColumns,
    image_url: (0, drizzle_orm_1.sql) `case when ${schema_1.doctors.image_revision} is null then null else '/api/v1/public/doctors/' || ${schema_1.doctors.id} || '/image?v=' || ${schema_1.doctors.image_revision} end`,
    published: schema_1.careDirectoryEntries.published,
    reviewedAt: schema_1.careDirectoryEntries.reviewedAt,
    reviewedBy: schema_1.careDirectoryEntries.reviewedBy,
    reviewEvidence: schema_1.careDirectoryEntries.reviewEvidence,
};
let DoctorsService = class DoctorsService {
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
        return (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.careDirectoryEntries.published, true), (0, drizzle_orm_1.sql) `exists (select 1 from ${schema_1.doctorDepartments} dd inner join ${schema_1.medicalDepartments} dep on dep.id=dd.department_id where dd.doctor_id=${schema_1.doctors.id} and dep.is_active=true)`, (0, drizzle_orm_1.gte)(schema_1.careDirectoryEntries.reviewedAt, new Date(Date.now() - 180 * 86400000)));
    }
    present(row, admin) {
        return admin ? row : { ...row, reviewedBy: undefined, reviewEvidence: undefined };
    }
    async list(query, admin = false) {
        const q = this.parse(admin ? doctors_input_1.doctorAdminQuery : doctors_input_1.doctorQuery, query), conditions = [];
        if (!admin)
            conditions.push(this.visible());
        else if ('status' in q && q.status !== 'all')
            conditions.push((0, drizzle_orm_1.eq)(schema_1.careDirectoryEntries.published, q.status === 'published'));
        if (q.city)
            conditions.push((0, drizzle_orm_1.sql) `lower(btrim(${schema_1.doctors.city}))=${q.city.toLowerCase()}`);
        if (q.state)
            conditions.push((0, drizzle_orm_1.sql) `lower(btrim(${schema_1.doctors.state}))=${q.state.toLowerCase()}`);
        if (q.department_id)
            conditions.push((0, drizzle_orm_1.sql) `exists(select 1 from ${schema_1.doctorDepartments} dd inner join ${schema_1.medicalDepartments} dep on dep.id=dd.department_id where dd.doctor_id=${schema_1.doctors.id} and dd.department_id=${q.department_id} ${admin ? (0, drizzle_orm_1.sql) `` : (0, drizzle_orm_1.sql) `and dep.is_active=true`})`);
        if (q.hospital_id)
            conditions.push((0, drizzle_orm_1.sql) `exists(select 1 from ${schema_1.doctorHospitalAffiliations} a inner join ${schema_1.careDirectoryEntries} c on c.id=a.hospital_id where a.doctor_id=${schema_1.doctors.id} and a.hospital_id=${q.hospital_id} ${admin ? (0, drizzle_orm_1.sql) `` : (0, drizzle_orm_1.sql) `and c.published=true and c.reviewed_at >= ${new Date(Date.now() - 180 * 86400000)}`})`);
        if (q.search) {
            const term = `%${q.search.replace(/[\\%_]/g, '\\$&')}%`;
            conditions.push((0, drizzle_orm_1.or)((0, drizzle_orm_1.ilike)(schema_1.doctors.name_en, term), (0, drizzle_orm_1.ilike)(schema_1.doctors.name_hi, term), (0, drizzle_orm_1.ilike)(schema_1.doctors.address_line1, term), (0, drizzle_orm_1.ilike)(schema_1.doctors.city, term), (0, drizzle_orm_1.ilike)(schema_1.doctors.landmark, term)));
        }
        const where = (0, drizzle_orm_1.and)(...conditions), [items, total] = await Promise.all([
            this.database.db
                .select(fields)
                .from(schema_1.doctors)
                .innerJoin(schema_1.careDirectoryEntries, (0, drizzle_orm_1.eq)(schema_1.careDirectoryEntries.id, schema_1.doctors.id))
                .where(where)
                .orderBy((0, drizzle_orm_1.asc)(q.language === 'hi'
                ? (0, drizzle_orm_1.sql) `coalesce(nullif(${schema_1.doctors.name_hi},''),${schema_1.doctors.name_en})`
                : (0, drizzle_orm_1.sql) `lower(${schema_1.doctors.name_en})`), (0, drizzle_orm_1.asc)(schema_1.doctors.id))
                .limit(q.limit)
                .offset((q.page - 1) * q.limit),
            this.database.db
                .select({ count: (0, drizzle_orm_1.count)() })
                .from(schema_1.doctors)
                .innerJoin(schema_1.careDirectoryEntries, (0, drizzle_orm_1.eq)(schema_1.careDirectoryEntries.id, schema_1.doctors.id))
                .where(where),
        ]);
        return {
            items: await Promise.all(items.map(async (row) => ({
                ...this.present(row, admin),
                ...(await this.relations(this.database.db, row.id, admin)),
            }))),
            total: total[0].count,
            page: q.page,
            hasNext: q.page * q.limit < total[0].count,
        };
    }
    async detail(id, admin = false) {
        this.parse(zod_1.z.uuid(), id);
        const [row] = await this.database.db
            .select(fields)
            .from(schema_1.doctors)
            .innerJoin(schema_1.careDirectoryEntries, (0, drizzle_orm_1.eq)(schema_1.careDirectoryEntries.id, schema_1.doctors.id))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.doctors.id, id), admin ? undefined : this.visible()))
            .limit(1);
        if (!row)
            throw new common_1.NotFoundException('Doctor not found or awaiting source review.');
        return { ...this.present(row, admin), ...(await this.relations(this.database.db, id, admin)) };
    }
    async write(operation) {
        try {
            return await this.database.db.transaction(async (tx) => {
                await tx.execute((0, drizzle_orm_1.sql) `select pg_advisory_xact_lock(6389022)`);
                await tx.execute((0, drizzle_orm_1.sql) `select pg_advisory_xact_lock(6389023)`);
                await tx.execute(lock);
                return operation(tx);
            });
        }
        catch (error) {
            if ((0, database_error_1.isUniqueViolation)(error))
                throw new common_1.ConflictException('This source key already exists. Use its existing record.');
            if ((0, database_error_1.getDatabaseErrorCode)(error) === '23503')
                throw new common_1.ConflictException('Doctor has linked records. Withdraw it instead of deleting.');
            throw error;
        }
    }
    async audit(tx, actorId, action, targetId, metadata = {}) {
        await tx
            .insert(schema_1.administrationAuditLogs)
            .values({ actorId, action: `doctors.${action}`, targetId, outcome: 'succeeded', metadata });
    }
    projection(value) {
        return {
            sourceKey: value.source_key,
            kind: 'doctor',
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
                specialties: [],
                qualifications: value.qualifications.join(', '),
                registration: value.registration_number,
                languages: value.languages,
                providerType: 'doctor',
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
    async relations(tx, id, admin) {
        const ds = await tx
            .select({
            id: schema_1.medicalDepartments.id,
            source_key: schema_1.medicalDepartments.source_key,
            name_en: schema_1.medicalDepartments.name_en,
            name_hi: schema_1.medicalDepartments.name_hi,
            is_active: schema_1.medicalDepartments.is_active,
        })
            .from(schema_1.doctorDepartments)
            .innerJoin(schema_1.medicalDepartments, (0, drizzle_orm_1.eq)(schema_1.medicalDepartments.id, schema_1.doctorDepartments.department_id))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.doctorDepartments.doctor_id, id), admin ? undefined : (0, drizzle_orm_1.eq)(schema_1.medicalDepartments.is_active, true)))
            .orderBy((0, drizzle_orm_1.asc)(schema_1.medicalDepartments.id));
        const hs = await tx
            .select({
            ...(0, drizzle_orm_1.getTableColumns)(schema_1.doctorHospitalAffiliations),
            name_en: schema_1.hospitals.name_en,
            name_hi: schema_1.hospitals.name_hi,
            city: schema_1.hospitals.city,
        })
            .from(schema_1.doctorHospitalAffiliations)
            .innerJoin(schema_1.hospitals, (0, drizzle_orm_1.eq)(schema_1.hospitals.id, schema_1.doctorHospitalAffiliations.hospital_id))
            .innerJoin(schema_1.careDirectoryEntries, (0, drizzle_orm_1.eq)(schema_1.careDirectoryEntries.id, schema_1.hospitals.id))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.doctorHospitalAffiliations.doctor_id, id), admin
            ? undefined
            : (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.careDirectoryEntries.published, true), (0, drizzle_orm_1.gte)(schema_1.careDirectoryEntries.reviewedAt, new Date(Date.now() - 180 * 86400000)))))
            .orderBy((0, drizzle_orm_1.asc)(schema_1.doctorHospitalAffiliations.hospital_id));
        return {
            department_ids: ds.map((d) => d.id),
            departments: ds,
            affiliations: hs.map(({ doctor_id: _doctor, ...a }) => {
                void _doctor;
                return a;
            }),
        };
    }
    async validateLinks(tx, value) {
        const ds = value.department_ids.length
            ? await tx
                .select({ id: schema_1.medicalDepartments.id })
                .from(schema_1.medicalDepartments)
                .where((0, drizzle_orm_1.inArray)(schema_1.medicalDepartments.id, value.department_ids))
            : [];
        const ids = value.affiliations.map((a) => a.hospital_id);
        const hs = ids.length
            ? await tx.select({ id: schema_1.hospitals.id }).from(schema_1.hospitals).where((0, drizzle_orm_1.inArray)(schema_1.hospitals.id, ids))
            : [];
        if (ds.length !== value.department_ids.length || hs.length !== ids.length)
            throw new common_1.BadRequestException('Every department and hospital must already exist.');
    }
    async saveLinks(tx, id, value) {
        await tx.delete(schema_1.doctorDepartments).where((0, drizzle_orm_1.eq)(schema_1.doctorDepartments.doctor_id, id));
        if (value.department_ids.length)
            await tx
                .insert(schema_1.doctorDepartments)
                .values(value.department_ids.map((department_id) => ({ doctor_id: id, department_id })));
        await tx.delete(schema_1.doctorHospitalAffiliations).where((0, drizzle_orm_1.eq)(schema_1.doctorHospitalAffiliations.doctor_id, id));
        await tx.delete(schema_1.careProviderAffiliations).where((0, drizzle_orm_1.eq)(schema_1.careProviderAffiliations.doctorId, id));
        if (value.affiliations.length) {
            await tx
                .insert(schema_1.doctorHospitalAffiliations)
                .values(value.affiliations.map((a) => ({ ...a, doctor_id: id })));
            await tx
                .insert(schema_1.careProviderAffiliations)
                .values(value.affiliations.map((a) => ({ doctorId: id, hospitalId: a.hospital_id })));
        }
        const names = value.department_ids.length
            ? await tx
                .select({ name: schema_1.medicalDepartments.name_en })
                .from(schema_1.medicalDepartments)
                .where((0, drizzle_orm_1.inArray)(schema_1.medicalDepartments.id, value.department_ids))
            : [];
        await tx
            .update(schema_1.careDirectoryEntries)
            .set({
            details: (0, drizzle_orm_1.sql) `jsonb_set(${schema_1.careDirectoryEntries.details}, '{specialties}', ${JSON.stringify(names.map((d) => d.name))}::jsonb)`,
        })
            .where((0, drizzle_orm_1.eq)(schema_1.careDirectoryEntries.id, id));
    }
    async data(tx, row) {
        const { id: _id, version: _v, created_at: _c, updated_at: _u, image_data: _image, image_alt: _alt, image_revision: _revision, ...profile } = row;
        void _id;
        void _v;
        void _c;
        void _u;
        void _image;
        void _alt;
        void _revision;
        const links = await this.relations(tx, row.id, true);
        return {
            ...profile,
            department_ids: links.department_ids,
            affiliations: links.affiliations.map(({ name_en: _n, name_hi: _h, city: _city, ...a }) => {
                void _n;
                void _h;
                void _city;
                return a;
            }),
        };
    }
    async insert(tx, value) {
        await this.validateLinks(tx, value);
        const id = (0, node_crypto_1.randomUUID)();
        await tx.insert(schema_1.careDirectoryEntries).values({ id, ...this.projection(value) });
        const [row] = await tx
            .insert(schema_1.doctors)
            .values({ id, ...this.profile(value) })
            .returning();
        await this.saveLinks(tx, id, value);
        return row;
    }
    async change(tx, row, value) {
        await this.validateLinks(tx, value);
        const [saved] = await tx
            .update(schema_1.doctors)
            .set({ ...this.profile(value), version: row.version + 1, updated_at: new Date() })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.doctors.id, row.id), (0, drizzle_orm_1.eq)(schema_1.doctors.version, row.version)))
            .returning();
        if (!saved)
            throw new common_1.ConflictException('Doctor changed. Reload first.');
        await tx.update(schema_1.careDirectoryEntries).set(this.projection(value)).where((0, drizzle_orm_1.eq)(schema_1.careDirectoryEntries.id, row.id));
        await this.saveLinks(tx, row.id, value);
        return saved;
    }
    create(actor, body) {
        const value = this.parse(doctors_input_1.doctorInput, body);
        return this.write(async (tx) => {
            const row = await this.insert(tx, value);
            await this.audit(tx, actor, 'create', row.id);
            return { ...(0, provider_image_1.omitProviderImage)(row), published: false };
        });
    }
    update(actor, id, body) {
        this.parse(zod_1.z.uuid(), id);
        const { expectedVersion, ...changes } = this.parse(doctors_input_1.doctorUpdate, body);
        return this.write(async (tx) => {
            const [row] = await tx.select().from(schema_1.doctors).where((0, drizzle_orm_1.eq)(schema_1.doctors.id, id));
            if (!row || row.version !== expectedVersion)
                throw new common_1.ConflictException('Doctor changed or was removed. Reload first.');
            const value = this.parse(doctors_input_1.doctorInput, { ...(await this.data(tx, row)), ...changes });
            const saved = await this.change(tx, row, value);
            await this.audit(tx, actor, 'update', id);
            return { ...(0, provider_image_1.omitProviderImage)(saved), published: false, reviewRequired: true };
        });
    }
    review(actor, id, body) {
        this.parse(zod_1.z.uuid(), id);
        const value = this.parse(doctors_input_1.doctorReview, body);
        return this.write(async (tx) => {
            const [row] = await tx.select().from(schema_1.doctors).where((0, drizzle_orm_1.eq)(schema_1.doctors.id, id));
            if (!row || row.version !== value.expectedVersion)
                throw new common_1.ConflictException('Doctor changed. Reload before reviewing.');
            const active = await tx
                .select({ id: schema_1.medicalDepartments.id })
                .from(schema_1.doctorDepartments)
                .innerJoin(schema_1.medicalDepartments, (0, drizzle_orm_1.eq)(schema_1.medicalDepartments.id, schema_1.doctorDepartments.department_id))
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.doctorDepartments.doctor_id, id), (0, drizzle_orm_1.eq)(schema_1.medicalDepartments.is_active, true)));
            if (value.publish &&
                (!row.source_url ||
                    !row.address_line1 ||
                    !row.phone_1 ||
                    !row.registration_number ||
                    !row.medical_council ||
                    !row.qualifications.length ||
                    !active.length))
                throw new common_1.BadRequestException('A source URL, address, phone, registration, medical council, qualifications and active department are required before publication.');
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
                .update(schema_1.doctors)
                .set({ version: row.version + 1, updated_at: new Date() })
                .where((0, drizzle_orm_1.eq)(schema_1.doctors.id, id))
                .returning();
            await this.audit(tx, actor, value.publish ? 'publish' : 'withdraw', id);
            return { ...(0, provider_image_1.omitProviderImage)(saved), published: value.publish };
        });
    }
    remove(actor, id, query) {
        this.parse(zod_1.z.uuid(), id);
        const { expected_version } = this.parse(doctors_input_1.doctorDelete, query);
        return this.write(async (tx) => {
            const [row] = await tx.select().from(schema_1.doctors).where((0, drizzle_orm_1.eq)(schema_1.doctors.id, id));
            if (!row || row.version !== expected_version)
                throw new common_1.ConflictException('Doctor changed or was removed. Reload first.');
            await tx.delete(schema_1.careProviderAffiliations).where((0, drizzle_orm_1.eq)(schema_1.careProviderAffiliations.doctorId, id));
            await tx.delete(schema_1.careDirectoryEntries).where((0, drizzle_orm_1.eq)(schema_1.careDirectoryEntries.id, id));
            await this.audit(tx, actor, 'delete', id);
            return { deleted: true };
        });
    }
    profile(value) {
        const { department_ids: _d, affiliations: _a, ...profile } = value;
        void _d;
        void _a;
        return profile;
    }
    async masters(tx) {
        return {
            departments: await tx.select().from(schema_1.medicalDepartments).orderBy((0, drizzle_orm_1.asc)(schema_1.medicalDepartments.id)),
            hospitals: await tx
                .select({
                id: schema_1.hospitals.id,
                source_key: schema_1.hospitals.source_key,
                name_en: schema_1.hospitals.name_en,
                city: schema_1.hospitals.city,
                version: schema_1.hospitals.version,
            })
                .from(schema_1.hospitals)
                .orderBy((0, drizzle_orm_1.asc)(schema_1.hospitals.id)),
            care: await tx
                .select({
                id: schema_1.careDirectoryEntries.id,
                published: schema_1.careDirectoryEntries.published,
                reviewedAt: schema_1.careDirectoryEntries.reviewedAt,
                updatedAt: schema_1.careDirectoryEntries.updatedAt,
            })
                .from(schema_1.careDirectoryEntries)
                .where((0, drizzle_orm_1.eq)(schema_1.careDirectoryEntries.kind, 'hospital'))
                .orderBy((0, drizzle_orm_1.asc)(schema_1.careDirectoryEntries.id)),
        };
    }
    async prepared(file) {
        try {
            return await (0, doctors_import_1.prepareDoctors)(file, await this.masters(this.database.db));
        }
        catch (error) {
            throw new common_1.BadRequestException(error instanceof Error ? error.message : 'Invalid doctor file.');
        }
    }
    async current(tx) {
        const profiles = await tx
            .select(fields)
            .from(schema_1.doctors)
            .innerJoin(schema_1.careDirectoryEntries, (0, drizzle_orm_1.eq)(schema_1.careDirectoryEntries.id, schema_1.doctors.id))
            .orderBy((0, drizzle_orm_1.asc)(schema_1.doctors.id));
        return {
            profiles,
            masters: await this.masters(tx),
            departments: await tx
                .select()
                .from(schema_1.doctorDepartments)
                .orderBy((0, drizzle_orm_1.asc)(schema_1.doctorDepartments.doctor_id), (0, drizzle_orm_1.asc)(schema_1.doctorDepartments.department_id)),
            affiliations: await tx
                .select()
                .from(schema_1.doctorHospitalAffiliations)
                .orderBy((0, drizzle_orm_1.asc)(schema_1.doctorHospitalAffiliations.doctor_id), (0, drizzle_orm_1.asc)(schema_1.doctorHospitalAffiliations.hospital_id)),
        };
    }
    async plan(prepared, existing, tx) {
        const keys = new Map(existing.profiles.map((row) => [row.source_key, row])), errors = [...prepared.errors];
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
            ignoredMetadataFields: prepared.ignoredMetadataFields,
            doctors: prepared.rows.length,
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
            .update('doctors-import-v1:' + value)
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
        await this.prepared(file);
        const [payload, signature, ...rest] = this.parse(zod_1.z.string().min(1).max(4096), token).split('.');
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
            const prepared = await (0, doctors_import_1.prepareDoctors)(file, await this.masters(tx));
            const existing = await this.current(tx);
            if (hash(JSON.stringify(existing)) !== authorization.state)
                throw new common_1.ConflictException('Doctors changed after preview. Preview again.');
            const plan = await this.plan(prepared, existing, tx);
            if (plan.errorCount)
                throw new common_1.BadRequestException({
                    message: 'Fix all import errors before applying.',
                    errors: plan.errors,
                });
            const keys = new Map(existing.profiles.map((row) => [row.source_key, row]));
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
            .select({ image_data: schema_1.doctors.image_data, image_revision: schema_1.doctors.image_revision })
            .from(schema_1.doctors)
            .innerJoin(schema_1.careDirectoryEntries, (0, drizzle_orm_1.eq)(schema_1.careDirectoryEntries.id, schema_1.doctors.id))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.doctors.id, id), admin ? undefined : this.visible()))
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
                .select({ version: schema_1.doctors.version })
                .from(schema_1.doctors)
                .where((0, drizzle_orm_1.eq)(schema_1.doctors.id, id));
            if (!existing || existing.version !== input.expectedVersion)
                throw new common_1.ConflictException('Record changed. Reload before uploading.');
            const revision = (0, node_crypto_1.randomUUID)();
            await tx
                .update(schema_1.doctors)
                .set({
                image_data: image,
                image_alt: input.alt,
                image_revision: revision,
                version: existing.version + 1,
                updated_at: new Date(),
            })
                .where((0, drizzle_orm_1.eq)(schema_1.doctors.id, id));
            await tx
                .update(schema_1.careDirectoryEntries)
                .set({
                imageUrl: `/api/v1/public/doctors/${id}/image?v=${revision}`,
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
                image_url: `/api/v1/public/doctors/${id}/image?v=${revision}`,
                image_alt: input.alt,
                published: false,
                reviewRequired: true,
            };
        });
    }
    removeImage(actor, id, query) {
        this.parse(zod_1.z.uuid(), id);
        const { expected_version } = this.parse(doctors_input_1.doctorDelete, query);
        return this.write(async (tx) => {
            const [existing] = await tx
                .select({ version: schema_1.doctors.version })
                .from(schema_1.doctors)
                .where((0, drizzle_orm_1.eq)(schema_1.doctors.id, id));
            if (!existing || existing.version !== expected_version)
                throw new common_1.ConflictException('Record changed. Reload before removing the image.');
            await tx
                .update(schema_1.doctors)
                .set({
                image_data: null,
                image_alt: '',
                image_revision: null,
                version: existing.version + 1,
                updated_at: new Date(),
            })
                .where((0, drizzle_orm_1.eq)(schema_1.doctors.id, id));
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
exports.DoctorsService = DoctorsService;
exports.DoctorsService = DoctorsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.DatabaseService,
        config_1.ConfigService])
], DoctorsService);
//# sourceMappingURL=doctors.service.js.map