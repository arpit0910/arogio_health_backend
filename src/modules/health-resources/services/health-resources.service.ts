import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  isNotNull,
  isNull,
  lte,
  or,
  sql,
  type SQL,
} from 'drizzle-orm';
import { z } from 'zod';
import { DatabaseService } from '../../../database/database.service';
import { healthArticles, healthArticleCategories, bloodBankDirectoryEntries } from '../../../database/schema';
import {
  articleInput,
  categoryInput,
  bankInput,
  listInput,
  nearbyInput,
  type DirectoryKind,
} from '../requests/health-resources.input';
import { prepareImport } from '../imports/import';
import { readDirectoryWorkbook } from '../imports/workbook';
import { topicImage } from '../content/thumbnails';
import { articleTopics } from '../content/article-topics';

const articleSummary = {
  id: healthArticles.id,
  source_id: healthArticles.source_id,
  title_en: healthArticles.title_en,
  title_hi: healthArticles.title_hi,
  excerpt_en: healthArticles.excerpt_en,
  excerpt_hi: healthArticles.excerpt_hi,
  reading_minutes_en: sql<number>`greatest(1, ceil(array_length(regexp_split_to_array(btrim(${healthArticles.content_en}), '[[:space:]]+'), 1) / 200.0))::integer`,
  reading_minutes_hi: sql<number>`greatest(1, ceil(array_length(regexp_split_to_array(btrim(coalesce(nullif(${healthArticles.content_hi}, ''), ${healthArticles.content_en})), '[[:space:]]+'), 1) / 200.0))::integer`,
  category: healthArticles.category,
  image_url: healthArticles.image_url,
  author_name: healthArticles.author_name,
  is_published: healthArticles.is_published,
  created_at: healthArticles.created_at,
  updated_at: healthArticles.updated_at,
};
@Injectable()
export class HealthResourcesService {
  constructor(private readonly database: DatabaseService) {}
  private parse<T>(schema: z.ZodType<T>, value: unknown): T {
    const parsed = schema.safeParse(value);
    if (!parsed.success)
      throw new BadRequestException(
        parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; '),
      );
    return parsed.data;
  }
  kind(value: string): DirectoryKind {
    return this.parse(z.enum(['articles', 'blood-banks']), value);
  }
  async listArticles(query: unknown, admin = false) {
    const q = this.parse(listInput, query),
      conditions: SQL[] = admin ? [] : [eq(healthArticles.is_published, true)];
    if (q.search)
      conditions.push(
        or(
          ilike(healthArticles.title_en, `%${q.search}%`),
          ilike(healthArticles.title_hi, `%${q.search}%`),
          ilike(healthArticles.category, `%${q.search}%`),
          sql`exists (select 1 from ${healthArticleCategories} where ${healthArticleCategories.name} = ${healthArticles.category} and ${healthArticleCategories.name_hi} ilike ${`%${q.search}%`})`,
        )!,
      );
    if (q.category) conditions.push(eq(healthArticles.category, q.category));
    const title =
      q.language === 'hi'
        ? sql`coalesce(nullif(${healthArticles.title_hi}, ''), ${healthArticles.title_en})`
        : healthArticles.title_en;
    const order =
      q.sort === 'random'
        ? sql`random()`
        : q.sort === 'oldest'
          ? asc(healthArticles.created_at)
          : q.sort === 'title_asc'
            ? asc(title)
            : q.sort === 'title_desc'
              ? desc(title)
              : desc(healthArticles.created_at);
    const [items, categories, total] = await Promise.all([
      this.database.db
        .select(articleSummary)
        .from(healthArticles)
        .where(and(...conditions))
        .orderBy(order, asc(healthArticles.id))
        .limit(q.limit + 1)
        .offset((q.page - 1) * q.limit),
      this.categories(admin),
      this.database.db
        .select({ count: count() })
        .from(healthArticles)
        .where(and(...conditions)),
    ]);
    return {
      items: items.slice(0, q.limit).map((item) => this.withThumbnail(item, categories)),
      page: q.page,
      hasNext: items.length > q.limit,
      categories: categories.map((item) => item.name),
      categoryDetails: categories,
      total: total[0]!.count,
    };
  }
  private withThumbnail<T extends { category: string; image_url: string }>(
    row: T,
    categories: { name: string; name_hi: string; image_url: string }[],
  ) {
    const category = categories.find((item) => item.name === row.category);
    return {
      ...row,
      thumbnail_url: row.image_url || category?.image_url || topicImage(row.category),
      category_hi: category?.name_hi || '',
    };
  }
  async categories(admin = false) {
    const [metadata, counts] = await Promise.all([
      this.database.db.select().from(healthArticleCategories).orderBy(asc(healthArticleCategories.name)),
      this.database.db
        .select({ name: healthArticles.category, count: count() })
        .from(healthArticles)
        .where(admin ? undefined : eq(healthArticles.is_published, true))
        .groupBy(healthArticles.category),
    ]);
    const names = new Set(
      admin
        ? [...metadata.map((row) => row.name), ...counts.map((row) => row.name)]
        : counts.map((row) => row.name),
    );
    return [...names].sort().map((name) => {
      const stored = metadata.find((row) => row.name === name),
        fallback = articleTopics.find((row) => row.name === name);
      return {
        name,
        name_hi: stored?.name_hi || fallback?.name_hi || '',
        description: stored?.description || fallback?.description || '',
        image_url: stored?.image_url || topicImage(name),
        ...(admin ? { custom_image_url: stored?.image_url || '' } : {}),
        count: counts.find((row) => row.name === name)?.count ?? 0,
      };
    });
  }
  async saveCategory(body: unknown) {
    const value = this.parse(categoryInput, body);
    await this.database.db
      .insert(healthArticleCategories)
      .values(value)
      .onConflictDoUpdate({
        target: healthArticleCategories.name,
        set: { ...value, updated_at: new Date() },
      });
    return { saved: true };
  }
  async article(id: string, admin = false) {
    this.parse(z.uuid(), id);
    const [row] = await this.database.db
      .select()
      .from(healthArticles)
      .where(and(eq(healthArticles.id, id), admin ? undefined : eq(healthArticles.is_published, true)))
      .limit(1);
    if (!row) throw new NotFoundException('Article not found.');
    return this.withThumbnail(row, await this.categories(admin));
  }
  private bankFilters(bloodGroup?: string, only24h = false, admin = false, sourced = false): SQL[] {
    const filters = admin ? [] : [eq(bloodBankDirectoryEntries.is_active, true)];
    if (sourced)
      filters.push(
        eq(bloodBankDirectoryEntries.city, 'Jaipur'),
        eq(bloodBankDirectoryEntries.is_verified, true),
        sql`${bloodBankDirectoryEntries.source_url} like 'https://%'`,
        gte(bloodBankDirectoryEntries.verified_at, new Date(Date.now() - 180 * 86400000)),
      );
    if (bloodGroup)
      filters.push(sql`${bloodBankDirectoryEntries.available_blood_groups} @> ARRAY[${bloodGroup}]::text[]`);
    if (only24h) filters.push(eq(bloodBankDirectoryEntries.is_24_7, true));
    return filters;
  }
  async listBanks(query: unknown, admin = false, sourced = false) {
    const q = this.parse(listInput, query),
      filters = this.bankFilters(q.bloodGroup, q.only24h === 'true', admin, sourced);
    if (q.search)
      filters.push(
        or(
          ...[
            bloodBankDirectoryEntries.name_en,
            bloodBankDirectoryEntries.name_hi,
            bloodBankDirectoryEntries.city,
            bloodBankDirectoryEntries.state,
            bloodBankDirectoryEntries.pincode,
          ].map((column) => ilike(column, `%${q.search}%`)),
        )!,
      );
    const [items, missing] = await Promise.all([
      this.database.db
        .select()
        .from(bloodBankDirectoryEntries)
        .where(and(...filters))
        .orderBy(asc(bloodBankDirectoryEntries.city), asc(bloodBankDirectoryEntries.name_en), asc(bloodBankDirectoryEntries.id))
        .limit(q.limit + 1)
        .offset((q.page - 1) * q.limit),
      this.database.db
        .select({ count: count() })
        .from(bloodBankDirectoryEntries)
        .where(and(...filters, or(isNull(bloodBankDirectoryEntries.latitude), isNull(bloodBankDirectoryEntries.longitude)))),
    ]);
    return {
      items: items.slice(0, q.limit),
      page: q.page,
      hasNext: items.length > q.limit,
      missingCoordinates: missing[0]!.count,
    };
  }
  async nearby(body: unknown, sourced = false) {
    const q = this.parse(nearbyInput, body),
      filters = this.bankFilters(q.bloodGroup, q.only24h, false, sourced);
    const distance = sql<number>`(6371.0 * 2 * asin(sqrt(least(1.0, greatest(0.0,
      power(sin(radians(${bloodBankDirectoryEntries.latitude} - ${q.latitude}) / 2), 2) + cos(radians(${q.latitude})) * cos(radians(${bloodBankDirectoryEntries.latitude})) * power(sin(radians(${bloodBankDirectoryEntries.longitude} - ${q.longitude}) / 2), 2)
    )))))`.mapWith(Number);
    const [items, missing] = await Promise.all([
      this.database.db
        .select({ bank: bloodBankDirectoryEntries, distanceKm: distance })
        .from(bloodBankDirectoryEntries)
        .where(
          and(
            ...filters,
            isNotNull(bloodBankDirectoryEntries.latitude),
            isNotNull(bloodBankDirectoryEntries.longitude),
            lte(distance, q.radiusKm),
          ),
        )
        .orderBy(asc(distance), asc(bloodBankDirectoryEntries.id))
        .limit(q.limit + 1)
        .offset((q.page - 1) * q.limit),
      this.database.db
        .select({ count: count() })
        .from(bloodBankDirectoryEntries)
        .where(and(...filters, or(isNull(bloodBankDirectoryEntries.latitude), isNull(bloodBankDirectoryEntries.longitude)))),
    ]);
    return {
      items: items.slice(0, q.limit).map((item) => ({ ...item.bank, distanceKm: item.distanceKm })),
      page: q.page,
      hasNext: items.length > q.limit,
      missingCoordinates: missing[0]!.count,
      radiusKm: q.radiusKm,
      distanceType: 'straight-line',
    };
  }
  async adminList(kind: DirectoryKind, query: unknown) {
    return kind === 'articles' ? this.listArticles(query, true) : this.listBanks(query, true);
  }
  async bank(id: string) {
    this.parse(z.uuid(), id);
    const [row] = await this.database.db
      .select()
      .from(bloodBankDirectoryEntries)
      .where(eq(bloodBankDirectoryEntries.id, id))
      .limit(1);
    if (!row) throw new NotFoundException('Blood bank not found.');
    return row;
  }
  async save(kind: DirectoryKind, id: string | null, body: unknown) {
    if (id) this.parse(z.uuid(), id);
    if (kind === 'articles') {
      const value = this.parse(articleInput, body);
      await this.database.db
        .insert(healthArticleCategories)
        .values({ name: value.category })
        .onConflictDoNothing();
      const rows = id
        ? await this.database.db
            .update(healthArticles)
            .set({ ...value, updated_at: new Date() })
            .where(eq(healthArticles.id, id))
            .returning()
        : await this.database.db
            .insert(healthArticles)
            .values({ ...value, source_id: `manual-${randomUUID()}` })
            .returning();
      if (!rows[0]) throw new NotFoundException();
      return rows[0];
    }
    const value = { ...this.parse(bankInput, body), is_verified: false, source_url: null, verified_at: null };
    const rows = id
      ? await this.database.db
          .update(bloodBankDirectoryEntries)
          .set({ ...value, updated_at: new Date() })
          .where(eq(bloodBankDirectoryEntries.id, id))
          .returning()
      : await this.database.db
          .insert(bloodBankDirectoryEntries)
          .values({ ...value, source_id: `manual-${randomUUID()}` })
          .returning();
    if (!rows[0]) throw new NotFoundException();
    return rows[0];
  }
  async remove(kind: DirectoryKind, id: string) {
    this.parse(z.uuid(), id);
    const rows =
      kind === 'articles'
        ? await this.database.db
            .delete(healthArticles)
            .where(eq(healthArticles.id, id))
            .returning({ id: healthArticles.id })
        : await this.database.db
            .delete(bloodBankDirectoryEntries)
            .where(eq(bloodBankDirectoryEntries.id, id))
            .returning({ id: bloodBankDirectoryEntries.id });
    if (!rows.length) throw new NotFoundException();
    return { deleted: true };
  }
  private async prepared(kind: DirectoryKind, file?: Express.Multer.File) {
    if (!file?.buffer) throw new BadRequestException('Choose an Excel (.xlsx) or UTF-8 CSV file.');
    try {
      const name = file.originalname.toLowerCase();
      if (!name.endsWith('.csv') && !name.endsWith('.xlsx'))
        throw new Error('Use .xlsx or .csv. Save legacy .xls workbooks as .xlsx first.');
      const workbook = name.endsWith('.xlsx')
        ? await readDirectoryWorkbook(file.buffer, kind)
        : { csv: file.buffer, categories: [] };
      const result = prepareImport(kind, workbook.csv);
      if (workbook.categories.length) {
        const names = new Set(workbook.categories.map((row) => row.name));
        if (result.articles.some((row) => !names.has(row.category)))
          throw new Error('Every article category must appear in the Categories worksheet.');
      }
      return { ...result, categories: workbook.categories };
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Import file could not be read.',
      );
    }
  }
  async preview(kind: DirectoryKind, file?: Express.Multer.File) {
    const result = await this.prepared(kind, file),
      ids = [...result.articles, ...result.banks].map((row) => row.source_id);
    const existing = !ids.length
      ? []
      : kind === 'articles'
        ? await this.database.db
            .select({ id: healthArticles.id })
            .from(healthArticles)
            .where(inArray(healthArticles.source_id, ids))
        : await this.database.db
            .select({ id: bloodBankDirectoryEntries.id })
            .from(bloodBankDirectoryEntries)
            .where(inArray(bloodBankDirectoryEntries.source_id, ids));
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
      sample:
        kind === 'articles'
          ? result.articles
              .slice(0, 5)
              .map((row) => ({ source_id: row.source_id, title: row.title_en }))
          : result.banks
              .slice(0, 5)
              .map((row) => ({ source_id: row.source_id, title: row.name_en })),
    };
  }
  async import(kind: DirectoryKind, file?: Express.Multer.File) {
    const result = await this.prepared(kind, file);
    if (result.errors.length)
      throw new BadRequestException(
        `Nothing imported. Fix ${result.errors.length} invalid rows first.`,
      );
    await this.database.db.transaction(async (tx) => {
      if (kind === 'articles') {
        for (const category of result.categories) {
          const { image_url, ...metadata } = category;
          await tx
            .insert(healthArticleCategories)
            .values(category)
            .onConflictDoUpdate({
              target: healthArticleCategories.name,
              set: { ...metadata, ...(image_url ? { image_url } : {}), updated_at: new Date() },
            });
        }
        for (const name of new Set(result.articles.map((row) => row.category)))
          await tx.insert(healthArticleCategories).values({ name }).onConflictDoNothing();
        for (const row of result.articles)
          await tx
            .insert(healthArticles)
            .values(row)
            .onConflictDoUpdate({
              target: healthArticles.source_id,
              set: { ...row, ...(row.image_url ? {} : { image_url: sql`${healthArticles.image_url}` }) },
            });
      } else
        for (const row of result.banks) {
          const { is_active: _active, ...updates } = row;
          void _active;
          await tx
            .insert(bloodBankDirectoryEntries)
            .values({ ...row, is_verified: false, source_url: null, verified_at: null })
            .onConflictDoUpdate({
              target: bloodBankDirectoryEntries.source_id,
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
}
