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
exports.HealthResourcesService = void 0;
const provider_image_1 = require("../../../common/media/provider-image");
const nearby_1 = require("../../../common/directory/nearby");
const admin_status_1 = require("../../../common/directory/admin-status");
const common_1 = require("@nestjs/common");
const node_crypto_1 = require("node:crypto");
const drizzle_orm_1 = require("drizzle-orm");
const zod_1 = require("zod");
const database_service_1 = require("../../../database/database.service");
const schema_1 = require("../../../database/schema");
const health_resources_input_1 = require("../requests/health-resources.input");
const import_1 = require("../imports/import");
const workbook_1 = require("../imports/workbook");
const thumbnails_1 = require("../content/thumbnails");
const article_topics_1 = require("../content/article-topics");
const articleSummary = {
    id: schema_1.healthArticles.id,
    title_en: schema_1.healthArticles.title_en,
    title_hi: schema_1.healthArticles.title_hi,
    excerpt_en: schema_1.healthArticles.excerpt_en,
    excerpt_hi: schema_1.healthArticles.excerpt_hi,
    reading_minutes_en: (0, drizzle_orm_1.sql) `greatest(1, ceil(array_length(regexp_split_to_array(btrim(${schema_1.healthArticles.content_en}), '[[:space:]]+'), 1) / 200.0))::integer`,
    reading_minutes_hi: (0, drizzle_orm_1.sql) `greatest(1, ceil(array_length(regexp_split_to_array(btrim(coalesce(nullif(${schema_1.healthArticles.content_hi}, ''), ${schema_1.healthArticles.content_en})), '[[:space:]]+'), 1) / 200.0))::integer`,
    category: schema_1.healthArticles.category,
    image_url: schema_1.healthArticles.image_url,
    thumbnailRevision: (0, drizzle_orm_1.sql) `(select t.revision from health_article_thumbnails t where t.article_id = ${schema_1.healthArticles.id})`,
    author_name: schema_1.healthArticles.author_name,
    is_published: schema_1.healthArticles.is_published,
    created_at: schema_1.healthArticles.created_at,
    updated_at: schema_1.healthArticles.updated_at,
};
function nextVisibilityTimestamp(current, expectedUpdatedAt) {
    if (current.toISOString() !== expectedUpdatedAt) {
        throw new common_1.ConflictException('This record changed. Refresh the list before changing visibility.');
    }
    return new Date(Math.max(Date.now(), current.getTime() + 1));
}
let HealthResourcesService = class HealthResourcesService {
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
        const q = this.parse(admin ? health_resources_input_1.adminArticleListInput : health_resources_input_1.listInput, query), conditions = admin ? [] : [(0, drizzle_orm_1.eq)(schema_1.healthArticles.is_published, true)];
        if (admin && q.status !== 'all')
            conditions.push((0, drizzle_orm_1.eq)(schema_1.healthArticles.is_published, q.status === 'published'));
        if (q.search)
            conditions.push((0, drizzle_orm_1.or)((0, drizzle_orm_1.ilike)(schema_1.healthArticles.title_en, `%${q.search}%`), (0, drizzle_orm_1.ilike)(schema_1.healthArticles.title_hi, `%${q.search}%`), (0, drizzle_orm_1.ilike)(schema_1.healthArticles.category, `%${q.search}%`), (0, drizzle_orm_1.sql) `exists (select 1 from ${schema_1.healthArticleCategories} where ${schema_1.healthArticleCategories.name} = ${schema_1.healthArticles.category} and ${schema_1.healthArticleCategories.name_hi} ilike ${`%${q.search}%`})`));
        if (q.category)
            conditions.push((0, drizzle_orm_1.eq)(schema_1.healthArticles.category, q.category));
        const title = q.language === 'hi'
            ? (0, drizzle_orm_1.sql) `coalesce(nullif(${schema_1.healthArticles.title_hi}, ''), ${schema_1.healthArticles.title_en})`
            : schema_1.healthArticles.title_en;
        const order = q.sort === 'random'
            ? (0, drizzle_orm_1.sql) `random()`
            : q.sort === 'oldest'
                ? (0, drizzle_orm_1.asc)(schema_1.healthArticles.created_at)
                : q.sort === 'title_asc'
                    ? (0, drizzle_orm_1.asc)(title)
                    : q.sort === 'title_desc'
                        ? (0, drizzle_orm_1.desc)(title)
                        : (0, drizzle_orm_1.desc)(schema_1.healthArticles.created_at);
        const [items, categories, total] = await Promise.all([
            this.database.db
                .select(articleSummary)
                .from(schema_1.healthArticles)
                .where((0, drizzle_orm_1.and)(...conditions))
                .orderBy(order, (0, drizzle_orm_1.asc)(schema_1.healthArticles.id))
                .limit(q.limit + 1)
                .offset((q.page - 1) * q.limit),
            this.categories(admin),
            this.database.db
                .select({ count: (0, drizzle_orm_1.count)() })
                .from(schema_1.healthArticles)
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
            thumbnail_url: row.thumbnailRevision
                ? `/api/v1/public/articles/${row.id}/thumbnail?v=${row.thumbnailRevision}`
                : row.image_url || category?.image_url || (0, thumbnails_1.topicImage)(row.category),
            category_hi: category?.name_hi || '',
        };
    }
    async categories(admin = false) {
        const [metadata, counts] = await Promise.all([
            this.database.db.select().from(schema_1.healthArticleCategories).orderBy((0, drizzle_orm_1.asc)(schema_1.healthArticleCategories.name)),
            this.database.db
                .select({ name: schema_1.healthArticles.category, count: (0, drizzle_orm_1.count)() })
                .from(schema_1.healthArticles)
                .where(admin ? undefined : (0, drizzle_orm_1.eq)(schema_1.healthArticles.is_published, true))
                .groupBy(schema_1.healthArticles.category),
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
        const value = this.parse(health_resources_input_1.categoryInput, body);
        await this.database.db
            .insert(schema_1.healthArticleCategories)
            .values(value)
            .onConflictDoUpdate({
            target: schema_1.healthArticleCategories.name,
            set: { ...value, updated_at: new Date() },
        });
        return { saved: true };
    }
    async article(id, admin = false) {
        this.parse(zod_1.z.uuid(), id);
        const [row] = await this.database.db
            .select({ ...articleSummary, content_en: schema_1.healthArticles.content_en, content_hi: schema_1.healthArticles.content_hi })
            .from(schema_1.healthArticles)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.healthArticles.id, id), admin ? undefined : (0, drizzle_orm_1.eq)(schema_1.healthArticles.is_published, true)))
            .limit(1);
        if (!row)
            throw new common_1.NotFoundException('Article not found.');
        return this.withThumbnail(row, await this.categories(admin));
    }
    async articleThumbnail(id, admin = false) {
        this.parse(zod_1.z.uuid(), id);
        const [row] = await this.database.db.select({ image_data: schema_1.healthArticleThumbnails.imageData, image_revision: schema_1.healthArticleThumbnails.revision })
            .from(schema_1.healthArticleThumbnails)
            .innerJoin(schema_1.healthArticles, (0, drizzle_orm_1.eq)(schema_1.healthArticleThumbnails.articleId, schema_1.healthArticles.id))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.healthArticles.id, id), admin ? undefined : (0, drizzle_orm_1.eq)(schema_1.healthArticles.is_published, true)));
        if (!row)
            throw new common_1.NotFoundException('Article thumbnail not found.');
        return row;
    }
    async saveArticleThumbnail(id, file) {
        this.parse(zod_1.z.uuid(), id);
        const imageData = await (0, provider_image_1.decodeProviderImage)(file);
        return this.database.db.transaction(async (tx) => {
            const [article] = await tx.select({ id: schema_1.healthArticles.id }).from(schema_1.healthArticles)
                .where((0, drizzle_orm_1.eq)(schema_1.healthArticles.id, id)).for('update');
            if (!article)
                throw new common_1.NotFoundException('Article not found.');
            const revision = (0, node_crypto_1.randomUUID)();
            await tx.insert(schema_1.healthArticleThumbnails).values({ articleId: id, imageData, revision })
                .onConflictDoUpdate({ target: schema_1.healthArticleThumbnails.articleId, set: { imageData, revision } });
            return { revision };
        });
    }
    async removeArticleThumbnail(id) {
        this.parse(zod_1.z.uuid(), id);
        await this.database.db.delete(schema_1.healthArticleThumbnails).where((0, drizzle_orm_1.eq)(schema_1.healthArticleThumbnails.articleId, id));
        return { removed: true };
    }
    bankFilters(bloodGroup, only24h = false, admin = false, reviewedOnly = false) {
        const filters = admin ? [] : [(0, drizzle_orm_1.eq)(schema_1.bloodBankDirectoryEntries.is_active, true)];
        if (reviewedOnly)
            filters.push((0, drizzle_orm_1.eq)(schema_1.bloodBankDirectoryEntries.city, 'Jaipur'), (0, drizzle_orm_1.eq)(schema_1.bloodBankDirectoryEntries.is_verified, true), (0, drizzle_orm_1.gte)(schema_1.bloodBankDirectoryEntries.verified_at, new Date(Date.now() - 180 * 86400000)));
        if (bloodGroup)
            filters.push((0, drizzle_orm_1.sql) `${schema_1.bloodBankDirectoryEntries.available_blood_groups} @> ARRAY[${bloodGroup}]::text[]`);
        if (only24h)
            filters.push((0, drizzle_orm_1.eq)(schema_1.bloodBankDirectoryEntries.is_24_7, true));
        return filters;
    }
    async listBanks(query, admin = false, reviewedOnly = false) {
        const q = this.parse(admin ? health_resources_input_1.adminBankListInput : health_resources_input_1.bankListInput, query), filters = this.bankFilters(q.bloodGroup, q.only24h === 'true', admin, reviewedOnly);
        if (q.city)
            filters.push((0, drizzle_orm_1.sql) `lower(btrim(${schema_1.bloodBankDirectoryEntries.city})) = ${q.city.toLowerCase()}`);
        if (q.search)
            filters.push(this.bankSearch(q.search));
        const baseWhere = (0, drizzle_orm_1.and)(...filters), statusPredicates = (0, admin_status_1.directoryPredicates)('blood-banks');
        const summary = admin ? (await this.database.db.select((0, admin_status_1.directoryCountFields)(statusPredicates)).from(schema_1.bloodBankDirectoryEntries).where(baseWhere))[0] : undefined;
        if (admin && q.status !== 'all')
            filters.push(q.status === 'published' ? statusPredicates.approved : statusPredicates[q.status]);
        const matchingTotal = admin ? (await this.database.db.select({ count: (0, drizzle_orm_1.count)() }).from(schema_1.bloodBankDirectoryEntries).where((0, drizzle_orm_1.and)(...filters)))[0]?.count : undefined;
        const [items, missing] = await Promise.all([
            this.database.db
                .select()
                .from(schema_1.bloodBankDirectoryEntries)
                .where((0, drizzle_orm_1.and)(...filters))
                .orderBy((0, drizzle_orm_1.asc)(schema_1.bloodBankDirectoryEntries.city), (0, drizzle_orm_1.asc)(schema_1.bloodBankDirectoryEntries.name_en), (0, drizzle_orm_1.asc)(schema_1.bloodBankDirectoryEntries.id))
                .limit(q.limit + 1)
                .offset((q.page - 1) * q.limit),
            this.database.db
                .select({ count: (0, drizzle_orm_1.count)() })
                .from(schema_1.bloodBankDirectoryEntries)
                .where((0, drizzle_orm_1.and)(...filters, (0, drizzle_orm_1.or)((0, drizzle_orm_1.isNull)(schema_1.bloodBankDirectoryEntries.latitude), (0, drizzle_orm_1.isNull)(schema_1.bloodBankDirectoryEntries.longitude)))),
        ]);
        return {
            ...(admin ? { summary, total: matchingTotal ?? 0 } : {}),
            items: items.slice(0, q.limit).map(row => ({ ...row, ...(admin ? { adminStatus: (0, admin_status_1.directoryRowStatus)('blood-banks', row) } : {}) })),
            page: q.page,
            hasNext: items.length > q.limit,
            missingCoordinates: missing[0].count,
        };
    }
    bankSearch(search) {
        const term = `%${search.replace(/[\\%_]/g, '\\$&')}%`;
        return (0, drizzle_orm_1.or)(...[
            schema_1.bloodBankDirectoryEntries.name_en, schema_1.bloodBankDirectoryEntries.name_hi,
            schema_1.bloodBankDirectoryEntries.city, schema_1.bloodBankDirectoryEntries.state, schema_1.bloodBankDirectoryEntries.pincode,
        ].map(column => (0, drizzle_orm_1.ilike)(column, term)));
    }
    async nearby(body, reviewedOnly = false) {
        const q = this.parse(health_resources_input_1.nearbyInput, body), filters = this.bankFilters(q.bloodGroup, q.only24h, false, reviewedOnly);
        if (q.search)
            filters.push(this.bankSearch(q.search));
        const { distance, withinRadius } = (0, nearby_1.nearbyDirectory)(schema_1.bloodBankDirectoryEntries.latitude, schema_1.bloodBankDirectoryEntries.longitude, q);
        const [items, missing] = await Promise.all([
            this.database.db
                .select({ bank: schema_1.bloodBankDirectoryEntries, distanceKm: distance })
                .from(schema_1.bloodBankDirectoryEntries)
                .where((0, drizzle_orm_1.and)(...filters, withinRadius))
                .orderBy((0, drizzle_orm_1.asc)(distance), (0, drizzle_orm_1.asc)(schema_1.bloodBankDirectoryEntries.id))
                .limit(q.limit + 1)
                .offset((q.page - 1) * q.limit),
            this.database.db
                .select({ count: (0, drizzle_orm_1.count)() })
                .from(schema_1.bloodBankDirectoryEntries)
                .where((0, drizzle_orm_1.and)(...filters, (0, drizzle_orm_1.or)((0, drizzle_orm_1.isNull)(schema_1.bloodBankDirectoryEntries.latitude), (0, drizzle_orm_1.isNull)(schema_1.bloodBankDirectoryEntries.longitude)))),
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
            .from(schema_1.bloodBankDirectoryEntries)
            .where((0, drizzle_orm_1.eq)(schema_1.bloodBankDirectoryEntries.id, id))
            .limit(1);
        if (!row)
            throw new common_1.NotFoundException('Blood bank not found.');
        return row;
    }
    async save(kind, id, body) {
        if (id)
            this.parse(zod_1.z.uuid(), id);
        if (kind === 'articles') {
            const value = this.parse(health_resources_input_1.articleInput, body);
            await this.database.db
                .insert(schema_1.healthArticleCategories)
                .values({ name: value.category })
                .onConflictDoNothing();
            const rows = id
                ? await this.database.db
                    .update(schema_1.healthArticles)
                    .set({ ...value, updated_at: new Date() })
                    .where((0, drizzle_orm_1.eq)(schema_1.healthArticles.id, id))
                    .returning()
                : await this.database.db
                    .insert(schema_1.healthArticles)
                    .values({ ...value, record_key: `manual-${(0, node_crypto_1.randomUUID)()}` })
                    .returning();
            if (!rows[0])
                throw new common_1.NotFoundException();
            return rows[0];
        }
        const draft = this.parse(health_resources_input_1.bankInput, body);
        const value = { ...draft, is_verified: false, verified_at: null };
        const rows = id
            ? await this.database.db
                .update(schema_1.bloodBankDirectoryEntries)
                .set({ ...value, updated_at: new Date() })
                .where((0, drizzle_orm_1.eq)(schema_1.bloodBankDirectoryEntries.id, id))
                .returning()
            : await this.database.db
                .insert(schema_1.bloodBankDirectoryEntries)
                .values({ ...value, record_key: `manual-${(0, node_crypto_1.randomUUID)()}` })
                .returning();
        if (!rows[0])
            throw new common_1.NotFoundException();
        return rows[0];
    }
    async setArticleVisibility(id, body, actorId) {
        this.parse(zod_1.z.uuid(), id);
        const { visible, expectedUpdatedAt } = this.parse(health_resources_input_1.visibilityInput, body);
        return this.database.db.transaction(async (tx) => {
            const [row] = await tx.select({ title: schema_1.healthArticles.title_en, visible: schema_1.healthArticles.is_published, updatedAt: schema_1.healthArticles.updated_at })
                .from(schema_1.healthArticles).where((0, drizzle_orm_1.eq)(schema_1.healthArticles.id, id)).for('update');
            if (!row)
                throw new common_1.NotFoundException('Article not found.');
            const updatedAt = nextVisibilityTimestamp(row.updatedAt, expectedUpdatedAt);
            if (row.visible === visible)
                return row;
            await tx.update(schema_1.healthArticles).set({ is_published: visible, updated_at: updatedAt }).where((0, drizzle_orm_1.eq)(schema_1.healthArticles.id, id));
            await tx.insert(schema_1.administrationAuditLogs).values({ actorId, targetId: id, action: visible ? 'articles.publish' : 'articles.unpublish', outcome: 'succeeded' });
            return { title: row.title, visible, updatedAt };
        });
    }
    async setBloodBankVisibility(id, body, actorId) {
        this.parse(zod_1.z.uuid(), id);
        const { visible, expectedUpdatedAt } = this.parse(health_resources_input_1.visibilityInput, body);
        return this.database.db.transaction(async (tx) => {
            const [row] = await tx.select({ visible: schema_1.bloodBankDirectoryEntries.is_active, updatedAt: schema_1.bloodBankDirectoryEntries.updated_at })
                .from(schema_1.bloodBankDirectoryEntries).where((0, drizzle_orm_1.eq)(schema_1.bloodBankDirectoryEntries.id, id)).for('update');
            if (!row)
                throw new common_1.NotFoundException('Blood bank not found.');
            const updatedAt = nextVisibilityTimestamp(row.updatedAt, expectedUpdatedAt);
            if (row.visible === visible)
                return row;
            await tx.update(schema_1.bloodBankDirectoryEntries).set({ is_active: visible, updated_at: updatedAt }).where((0, drizzle_orm_1.eq)(schema_1.bloodBankDirectoryEntries.id, id));
            await tx.insert(schema_1.administrationAuditLogs).values({ actorId, targetId: id, action: visible ? 'blood-banks.show' : 'blood-banks.hide', outcome: 'succeeded' });
            return { visible, updatedAt };
        });
    }
    async remove(kind, id) {
        this.parse(zod_1.z.uuid(), id);
        const rows = kind === 'articles'
            ? await this.database.db
                .delete(schema_1.healthArticles)
                .where((0, drizzle_orm_1.eq)(schema_1.healthArticles.id, id))
                .returning({ id: schema_1.healthArticles.id })
            : await this.database.db
                .delete(schema_1.bloodBankDirectoryEntries)
                .where((0, drizzle_orm_1.eq)(schema_1.bloodBankDirectoryEntries.id, id))
                .returning({ id: schema_1.bloodBankDirectoryEntries.id });
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
        const result = await this.prepared(kind, file), ids = [...result.articles, ...result.banks].map((row) => row.record_key);
        const existing = !ids.length
            ? []
            : kind === 'articles'
                ? await this.database.db
                    .select({ id: schema_1.healthArticles.id })
                    .from(schema_1.healthArticles)
                    .where((0, drizzle_orm_1.inArray)(schema_1.healthArticles.record_key, ids))
                : await this.database.db
                    .select({ id: schema_1.bloodBankDirectoryEntries.id })
                    .from(schema_1.bloodBankDirectoryEntries)
                    .where((0, drizzle_orm_1.inArray)(schema_1.bloodBankDirectoryEntries.record_key, ids));
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
                    .map((row) => ({ record_key: row.record_key, title: row.title_en }))
                : result.banks
                    .slice(0, 5)
                    .map((row) => ({ record_key: row.record_key, title: row.name_en })),
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
                        .insert(schema_1.healthArticleCategories)
                        .values(category)
                        .onConflictDoUpdate({
                        target: schema_1.healthArticleCategories.name,
                        set: { ...metadata, ...(image_url ? { image_url } : {}), updated_at: new Date() },
                    });
                }
                for (const name of new Set(result.articles.map((row) => row.category)))
                    await tx.insert(schema_1.healthArticleCategories).values({ name }).onConflictDoNothing();
                for (const row of result.articles)
                    await tx
                        .insert(schema_1.healthArticles)
                        .values(row)
                        .onConflictDoUpdate({
                        target: schema_1.healthArticles.record_key,
                        set: { ...row, ...(row.image_url ? {} : { image_url: (0, drizzle_orm_1.sql) `${schema_1.healthArticles.image_url}` }) },
                    });
            }
            else
                for (const row of result.banks) {
                    const { is_active: _active, ...updates } = row;
                    void _active;
                    await tx
                        .insert(schema_1.bloodBankDirectoryEntries)
                        .values({ ...row, is_verified: false, verified_at: null })
                        .onConflictDoUpdate({
                        target: schema_1.bloodBankDirectoryEntries.record_key,
                        set: { ...updates, is_verified: false, verified_at: null, updated_at: new Date() },
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
exports.HealthResourcesService = HealthResourcesService;
exports.HealthResourcesService = HealthResourcesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.DatabaseService])
], HealthResourcesService);
//# sourceMappingURL=health-resources.service.js.map