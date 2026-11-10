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
exports.DirectoryService = void 0;
const common_1 = require("@nestjs/common");
const node_crypto_1 = require("node:crypto");
const drizzle_orm_1 = require("drizzle-orm");
const zod_1 = require("zod");
const database_service_1 = require("../../database/database.service");
const schema_1 = require("../../database/schema");
const directory_input_1 = require("./directory.input");
const import_1 = require("./import");
const workbook_1 = require("./workbook");
const thumbnails_1 = require("./thumbnails");
const article_topics_1 = require("./article-topics");
const articleSummary = {
    id: schema_1.articles.id,
    source_id: schema_1.articles.source_id,
    title_en: schema_1.articles.title_en,
    title_hi: schema_1.articles.title_hi,
    excerpt_en: schema_1.articles.excerpt_en,
    excerpt_hi: schema_1.articles.excerpt_hi,
    category: schema_1.articles.category,
    image_url: schema_1.articles.image_url,
    author_name: schema_1.articles.author_name,
    is_published: schema_1.articles.is_published,
    created_at: schema_1.articles.created_at,
    updated_at: schema_1.articles.updated_at,
};
let DirectoryService = class DirectoryService {
    database;
    constructor(database) {
        this.database = database;
    }
    parse(schema, value) {
        const parsed = schema.safeParse(value);
        if (!parsed.success)
            throw new common_1.BadRequestException(parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; '));
        return parsed.data;
    }
    kind(value) {
        return this.parse(zod_1.z.enum(['articles', 'blood-banks']), value);
    }
    async listArticles(query, admin = false) {
        const q = this.parse(directory_input_1.listInput, query), conditions = admin ? [] : [(0, drizzle_orm_1.eq)(schema_1.articles.is_published, true)];
        if (q.search)
            conditions.push((0, drizzle_orm_1.or)((0, drizzle_orm_1.ilike)(schema_1.articles.title_en, `%${q.search}%`), (0, drizzle_orm_1.ilike)(schema_1.articles.title_hi, `%${q.search}%`), (0, drizzle_orm_1.ilike)(schema_1.articles.category, `%${q.search}%`), (0, drizzle_orm_1.sql) `exists (select 1 from ${schema_1.articleCategories} where ${schema_1.articleCategories.name} = ${schema_1.articles.category} and ${schema_1.articleCategories.name_hi} ilike ${`%${q.search}%`})`));
        if (q.category)
            conditions.push((0, drizzle_orm_1.eq)(schema_1.articles.category, q.category));
        const title = q.language === 'hi'
            ? (0, drizzle_orm_1.sql) `coalesce(nullif(${schema_1.articles.title_hi}, ''), ${schema_1.articles.title_en})`
            : schema_1.articles.title_en;
        const order = q.sort === 'random'
            ? (0, drizzle_orm_1.sql) `random()`
            : q.sort === 'oldest'
                ? (0, drizzle_orm_1.asc)(schema_1.articles.created_at)
                : q.sort === 'title_asc'
                    ? (0, drizzle_orm_1.asc)(title)
                    : q.sort === 'title_desc'
                        ? (0, drizzle_orm_1.desc)(title)
                        : (0, drizzle_orm_1.desc)(schema_1.articles.created_at);
        const [items, categories, total] = await Promise.all([
            this.database.db
                .select(articleSummary)
                .from(schema_1.articles)
                .where((0, drizzle_orm_1.and)(...conditions))
                .orderBy(order, (0, drizzle_orm_1.asc)(schema_1.articles.id))
                .limit(q.limit + 1)
                .offset((q.page - 1) * q.limit),
            this.categories(admin),
            this.database.db
                .select({ count: (0, drizzle_orm_1.count)() })
                .from(schema_1.articles)
                .where((0, drizzle_orm_1.and)(...conditions)),
        ]);
        return {
            items: items.slice(0, q.limit).map((item) => this.withThumbnail(item, categories)),
            page: q.page,
            hasNext: items.length > q.limit,
            categories: categories.map((item) => item.name),
            categoryDetails: categories,
            total: total[0].count,
        };
    }
    withThumbnail(row, categories) {
        const category = categories.find((item) => item.name === row.category);
        return {
            ...row,
            thumbnail_url: row.image_url || category?.image_url || (0, thumbnails_1.topicImage)(row.category),
            category_hi: category?.name_hi || '',
        };
    }
    async categories(admin = false) {
        const [metadata, counts] = await Promise.all([
            this.database.db.select().from(schema_1.articleCategories).orderBy((0, drizzle_orm_1.asc)(schema_1.articleCategories.name)),
            this.database.db
                .select({ name: schema_1.articles.category, count: (0, drizzle_orm_1.count)() })
                .from(schema_1.articles)
                .where(admin ? undefined : (0, drizzle_orm_1.eq)(schema_1.articles.is_published, true))
                .groupBy(schema_1.articles.category),
        ]);
        const names = new Set(admin
            ? [...metadata.map((row) => row.name), ...counts.map((row) => row.name)]
            : counts.map((row) => row.name));
        return [...names].sort().map((name) => {
            const stored = metadata.find((row) => row.name === name), fallback = article_topics_1.articleTopics.find((row) => row.name === name);
            return {
                name,
                name_hi: stored?.name_hi || fallback?.name_hi || '',
                description: stored?.description || fallback?.description || '',
                image_url: stored?.image_url || (0, thumbnails_1.topicImage)(name),
                ...(admin ? { custom_image_url: stored?.image_url || '' } : {}),
                count: counts.find((row) => row.name === name)?.count ?? 0,
            };
        });
    }
    async saveCategory(body) {
        const value = this.parse(directory_input_1.categoryInput, body);
        await this.database.db
            .insert(schema_1.articleCategories)
            .values(value)
            .onConflictDoUpdate({
            target: schema_1.articleCategories.name,
            set: { ...value, updated_at: new Date() },
        });
        return { saved: true };
    }
    async article(id, admin = false) {
        this.parse(zod_1.z.uuid(), id);
        const [row] = await this.database.db
            .select()
            .from(schema_1.articles)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.articles.id, id), admin ? undefined : (0, drizzle_orm_1.eq)(schema_1.articles.is_published, true)))
            .limit(1);
        if (!row)
            throw new common_1.NotFoundException('Article not found.');
        return this.withThumbnail(row, await this.categories(admin));
    }
    bankFilters(bloodGroup, only24h = false, admin = false, sourced = false) {
        const filters = admin ? [] : [(0, drizzle_orm_1.eq)(schema_1.bloodBanks.is_active, true)];
        if (sourced)
            filters.push((0, drizzle_orm_1.eq)(schema_1.bloodBanks.city, 'Jaipur'), (0, drizzle_orm_1.eq)(schema_1.bloodBanks.is_verified, true), (0, drizzle_orm_1.sql) `${schema_1.bloodBanks.source_url} like 'https://%'`, (0, drizzle_orm_1.gte)(schema_1.bloodBanks.verified_at, new Date(Date.now() - 180 * 86400000)));
        if (bloodGroup)
            filters.push((0, drizzle_orm_1.sql) `${schema_1.bloodBanks.available_blood_groups} @> ARRAY[${bloodGroup}]::text[]`);
        if (only24h)
            filters.push((0, drizzle_orm_1.eq)(schema_1.bloodBanks.is_24_7, true));
        return filters;
    }
    async listBanks(query, admin = false, sourced = false) {
        const q = this.parse(directory_input_1.listInput, query), filters = this.bankFilters(q.bloodGroup, q.only24h === 'true', admin, sourced);
        if (q.search)
            filters.push((0, drizzle_orm_1.or)(...[
                schema_1.bloodBanks.name_en,
                schema_1.bloodBanks.name_hi,
                schema_1.bloodBanks.city,
                schema_1.bloodBanks.state,
                schema_1.bloodBanks.pincode,
            ].map((column) => (0, drizzle_orm_1.ilike)(column, `%${q.search}%`))));
        const [items, missing] = await Promise.all([
            this.database.db
                .select()
                .from(schema_1.bloodBanks)
                .where((0, drizzle_orm_1.and)(...filters))
                .orderBy((0, drizzle_orm_1.asc)(schema_1.bloodBanks.city), (0, drizzle_orm_1.asc)(schema_1.bloodBanks.name_en), (0, drizzle_orm_1.asc)(schema_1.bloodBanks.id))
                .limit(q.limit + 1)
                .offset((q.page - 1) * q.limit),
            this.database.db
                .select({ count: (0, drizzle_orm_1.count)() })
                .from(schema_1.bloodBanks)
                .where((0, drizzle_orm_1.and)(...filters, (0, drizzle_orm_1.or)((0, drizzle_orm_1.isNull)(schema_1.bloodBanks.latitude), (0, drizzle_orm_1.isNull)(schema_1.bloodBanks.longitude)))),
        ]);
        return {
            items: items.slice(0, q.limit),
            page: q.page,
            hasNext: items.length > q.limit,
            missingCoordinates: missing[0].count,
        };
    }
    async nearby(body, sourced = false) {
        const q = this.parse(directory_input_1.nearbyInput, body), filters = this.bankFilters(q.bloodGroup, q.only24h, false, sourced);
        const distance = (0, drizzle_orm_1.sql) `(6371.0 * 2 * asin(sqrt(least(1.0, greatest(0.0,
      power(sin(radians(${schema_1.bloodBanks.latitude} - ${q.latitude}) / 2), 2) + cos(radians(${q.latitude})) * cos(radians(${schema_1.bloodBanks.latitude})) * power(sin(radians(${schema_1.bloodBanks.longitude} - ${q.longitude}) / 2), 2)
    )))))`.mapWith(Number);
        const [items, missing] = await Promise.all([
            this.database.db
                .select({ bank: schema_1.bloodBanks, distanceKm: distance })
                .from(schema_1.bloodBanks)
                .where((0, drizzle_orm_1.and)(...filters, (0, drizzle_orm_1.isNotNull)(schema_1.bloodBanks.latitude), (0, drizzle_orm_1.isNotNull)(schema_1.bloodBanks.longitude), (0, drizzle_orm_1.lte)(distance, q.radiusKm)))
                .orderBy((0, drizzle_orm_1.asc)(distance), (0, drizzle_orm_1.asc)(schema_1.bloodBanks.id))
                .limit(q.limit + 1)
                .offset((q.page - 1) * q.limit),
            this.database.db
                .select({ count: (0, drizzle_orm_1.count)() })
                .from(schema_1.bloodBanks)
                .where((0, drizzle_orm_1.and)(...filters, (0, drizzle_orm_1.or)((0, drizzle_orm_1.isNull)(schema_1.bloodBanks.latitude), (0, drizzle_orm_1.isNull)(schema_1.bloodBanks.longitude)))),
        ]);
        return {
            items: items.slice(0, q.limit).map((item) => ({ ...item.bank, distanceKm: item.distanceKm })),
            page: q.page,
            hasNext: items.length > q.limit,
            missingCoordinates: missing[0].count,
            radiusKm: q.radiusKm,
            distanceType: 'straight-line',
        };
    }
    async adminList(kind, query) {
        return kind === 'articles' ? this.listArticles(query, true) : this.listBanks(query, true);
    }
    async bank(id) {
        this.parse(zod_1.z.uuid(), id);
        const [row] = await this.database.db
            .select()
            .from(schema_1.bloodBanks)
            .where((0, drizzle_orm_1.eq)(schema_1.bloodBanks.id, id))
            .limit(1);
        if (!row)
            throw new common_1.NotFoundException('Blood bank not found.');
        return row;
    }
    async save(kind, id, body) {
        if (id)
            this.parse(zod_1.z.uuid(), id);
        if (kind === 'articles') {
            const value = this.parse(directory_input_1.articleInput, body);
            await this.database.db
                .insert(schema_1.articleCategories)
                .values({ name: value.category })
                .onConflictDoNothing();
            const rows = id
                ? await this.database.db
                    .update(schema_1.articles)
                    .set({ ...value, updated_at: new Date() })
                    .where((0, drizzle_orm_1.eq)(schema_1.articles.id, id))
                    .returning()
                : await this.database.db
                    .insert(schema_1.articles)
                    .values({ ...value, source_id: `manual-${(0, node_crypto_1.randomUUID)()}` })
                    .returning();
            if (!rows[0])
                throw new common_1.NotFoundException();
            return rows[0];
        }
        const value = { ...this.parse(directory_input_1.bankInput, body), is_verified: false, source_url: null, verified_at: null };
        const rows = id
            ? await this.database.db
                .update(schema_1.bloodBanks)
                .set({ ...value, updated_at: new Date() })
                .where((0, drizzle_orm_1.eq)(schema_1.bloodBanks.id, id))
                .returning()
            : await this.database.db
                .insert(schema_1.bloodBanks)
                .values({ ...value, source_id: `manual-${(0, node_crypto_1.randomUUID)()}` })
                .returning();
        if (!rows[0])
            throw new common_1.NotFoundException();
        return rows[0];
    }
    async remove(kind, id) {
        this.parse(zod_1.z.uuid(), id);
        const rows = kind === 'articles'
            ? await this.database.db
                .delete(schema_1.articles)
                .where((0, drizzle_orm_1.eq)(schema_1.articles.id, id))
                .returning({ id: schema_1.articles.id })
            : await this.database.db
                .delete(schema_1.bloodBanks)
                .where((0, drizzle_orm_1.eq)(schema_1.bloodBanks.id, id))
                .returning({ id: schema_1.bloodBanks.id });
        if (!rows.length)
            throw new common_1.NotFoundException();
        return { deleted: true };
    }
    async prepared(kind, file) {
        if (!file?.buffer)
            throw new common_1.BadRequestException('Choose an Excel (.xlsx) or UTF-8 CSV file.');
        try {
            const name = file.originalname.toLowerCase();
            if (!name.endsWith('.csv') && !name.endsWith('.xlsx'))
                throw new Error('Use .xlsx or .csv. Save legacy .xls workbooks as .xlsx first.');
            const workbook = name.endsWith('.xlsx')
                ? await (0, workbook_1.readDirectoryWorkbook)(file.buffer, kind)
                : { csv: file.buffer, categories: [] };
            const result = (0, import_1.prepareImport)(kind, workbook.csv);
            if (workbook.categories.length) {
                const names = new Set(workbook.categories.map((row) => row.name));
                if (result.articles.some((row) => !names.has(row.category)))
                    throw new Error('Every article category must appear in the Categories worksheet.');
            }
            return { ...result, categories: workbook.categories };
        }
        catch (error) {
            throw new common_1.BadRequestException(error instanceof Error ? error.message : 'Import file could not be read.');
        }
    }
    async preview(kind, file) {
        const result = await this.prepared(kind, file), ids = [...result.articles, ...result.banks].map((row) => row.source_id);
        const existing = !ids.length
            ? []
            : kind === 'articles'
                ? await this.database.db
                    .select({ id: schema_1.articles.id })
                    .from(schema_1.articles)
                    .where((0, drizzle_orm_1.inArray)(schema_1.articles.source_id, ids))
                : await this.database.db
                    .select({ id: schema_1.bloodBanks.id })
                    .from(schema_1.bloodBanks)
                    .where((0, drizzle_orm_1.inArray)(schema_1.bloodBanks.source_id, ids));
        return {
            totalRows: result.totalRows,
            validRows: ids.length,
            errorCount: result.errors.length,
            errors: result.errors.slice(0, 100),
            creates: ids.length - existing.length,
            updates: existing.length,
            publishedRows: result.articles.filter((row) => row.is_published).length,
            categoryCount: new Set(result.articles.map((row) => row.category)).size,
            thumbnailFallbacks: result.articles.filter((row) => !row.image_url).length,
            missingCoordinates: result.banks.filter((row) => row.latitude == null).length,
            sample: kind === 'articles'
                ? result.articles
                    .slice(0, 5)
                    .map((row) => ({ source_id: row.source_id, title: row.title_en }))
                : result.banks
                    .slice(0, 5)
                    .map((row) => ({ source_id: row.source_id, title: row.name_en })),
        };
    }
    async import(kind, file) {
        const result = await this.prepared(kind, file);
        if (result.errors.length)
            throw new common_1.BadRequestException(`Nothing imported. Fix ${result.errors.length} invalid rows first.`);
        await this.database.db.transaction(async (tx) => {
            if (kind === 'articles') {
                for (const category of result.categories) {
                    const { image_url, ...metadata } = category;
                    await tx
                        .insert(schema_1.articleCategories)
                        .values(category)
                        .onConflictDoUpdate({
                        target: schema_1.articleCategories.name,
                        set: { ...metadata, ...(image_url ? { image_url } : {}), updated_at: new Date() },
                    });
                }
                for (const name of new Set(result.articles.map((row) => row.category)))
                    await tx.insert(schema_1.articleCategories).values({ name }).onConflictDoNothing();
                for (const row of result.articles)
                    await tx
                        .insert(schema_1.articles)
                        .values(row)
                        .onConflictDoUpdate({
                        target: schema_1.articles.source_id,
                        set: { ...row, ...(row.image_url ? {} : { image_url: (0, drizzle_orm_1.sql) `${schema_1.articles.image_url}` }) },
                    });
            }
            else
                for (const row of result.banks) {
                    const { is_active: _active, ...updates } = row;
                    void _active;
                    await tx
                        .insert(schema_1.bloodBanks)
                        .values({ ...row, is_verified: false, source_url: null, verified_at: null })
                        .onConflictDoUpdate({
                        target: schema_1.bloodBanks.source_id,
                        set: { ...updates, is_verified: false, source_url: null, verified_at: null, updated_at: new Date() },
                    });
                }
        });
        return {
            imported: result.totalRows,
            categories: new Set(result.articles.map((row) => row.category)).size,
            missingCoordinates: result.banks.filter((row) => row.latitude == null).length,
        };
    }
};
exports.DirectoryService = DirectoryService;
exports.DirectoryService = DirectoryService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.DatabaseService])
], DirectoryService);
//# sourceMappingURL=directory.service.js.map