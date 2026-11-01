import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  and,
  asc,
  count,
  desc,
  eq,
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
import { DatabaseService } from '../../database/database.service';
import { articles, articleCategories, bloodBanks } from '../../database/schema';
import {
  articleInput,
  categoryInput,
  bankInput,
  listInput,
  nearbyInput,
  type DirectoryKind,
} from './directory.input';
import { prepareImport } from './import';
import { readDirectoryWorkbook } from './workbook';
import { topicImage } from './thumbnails';
import { articleTopics } from './article-topics';

const articleSummary = {
  id: articles.id,
  source_id: articles.source_id,
  title_en: articles.title_en,
  title_hi: articles.title_hi,
  excerpt_en: articles.excerpt_en,
  excerpt_hi: articles.excerpt_hi,
  category: articles.category,
  image_url: articles.image_url,
  author_name: articles.author_name,
  is_published: articles.is_published,
  created_at: articles.created_at,
  updated_at: articles.updated_at,
};
@Injectable()
export class DirectoryService {
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
      conditions: SQL[] = admin ? [] : [eq(articles.is_published, true)];
    if (q.search)
      conditions.push(
        or(
          ilike(articles.title_en, `%${q.search}%`),
          ilike(articles.title_hi, `%${q.search}%`),
          ilike(articles.category, `%${q.search}%`),
          sql`exists (select 1 from ${articleCategories} where ${articleCategories.name} = ${articles.category} and ${articleCategories.name_hi} ilike ${`%${q.search}%`})`,
        )!,
      );
    if (q.category) conditions.push(eq(articles.category, q.category));
    const title =
      q.language === 'hi'
        ? sql`coalesce(nullif(${articles.title_hi}, ''), ${articles.title_en})`
        : articles.title_en;
    const order =
      q.sort === 'oldest'
        ? asc(articles.created_at)
        : q.sort === 'title_asc'
          ? asc(title)
          : q.sort === 'title_desc'
            ? desc(title)
            : desc(articles.created_at);
    const [items, categories, total] = await Promise.all([
      this.database.db
        .select(articleSummary)
        .from(articles)
        .where(and(...conditions))
        .orderBy(order, asc(articles.id))
        .limit(q.limit + 1)
        .offset((q.page - 1) * q.limit),
      this.categories(admin),
      this.database.db
        .select({ count: count() })
        .from(articles)
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
      this.database.db.select().from(articleCategories).orderBy(asc(articleCategories.name)),
      this.database.db
        .select({ name: articles.category, count: count() })
        .from(articles)
        .where(admin ? undefined : eq(articles.is_published, true))
        .groupBy(articles.category),
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
      .insert(articleCategories)
      .values(value)
      .onConflictDoUpdate({
        target: articleCategories.name,
        set: { ...value, updated_at: new Date() },
      });
    return { saved: true };
  }
  async article(id: string, admin = false) {
    this.parse(z.uuid(), id);
    const [row] = await this.database.db
      .select()
      .from(articles)
      .where(and(eq(articles.id, id), admin ? undefined : eq(articles.is_published, true)))
      .limit(1);
    if (!row) throw new NotFoundException('Article not found.');
    return this.withThumbnail(row, await this.categories(admin));
  }
  private bankFilters(bloodGroup?: string, only24h = false, admin = false): SQL[] {
    const filters = admin ? [] : [eq(bloodBanks.is_active, true)];
    if (bloodGroup)
      filters.push(sql`${bloodBanks.available_blood_groups} @> ARRAY[${bloodGroup}]::text[]`);
    if (only24h) filters.push(eq(bloodBanks.is_24_7, true));
    return filters;
  }
  async listBanks(query: unknown, admin = false) {
    const q = this.parse(listInput, query),
      filters = this.bankFilters(q.bloodGroup, q.only24h === 'true', admin);
    if (q.search)
      filters.push(
        or(
          ...[
            bloodBanks.name_en,
            bloodBanks.name_hi,
            bloodBanks.city,
            bloodBanks.state,
            bloodBanks.pincode,
          ].map((column) => ilike(column, `%${q.search}%`)),
        )!,
      );
    const [items, missing] = await Promise.all([
      this.database.db
        .select()
        .from(bloodBanks)
        .where(and(...filters))
        .orderBy(asc(bloodBanks.city), asc(bloodBanks.name_en), asc(bloodBanks.id))
        .limit(q.limit + 1)
        .offset((q.page - 1) * q.limit),
      this.database.db
        .select({ count: count() })
        .from(bloodBanks)
        .where(and(...filters, or(isNull(bloodBanks.latitude), isNull(bloodBanks.longitude)))),
    ]);
    return {
      items: items.slice(0, q.limit),
      page: q.page,
      hasNext: items.length > q.limit,
      missingCoordinates: missing[0]!.count,
    };
  }
  async nearby(body: unknown) {
    const q = this.parse(nearbyInput, body),
      filters = this.bankFilters(q.bloodGroup, q.only24h);
    const distance = sql<number>`(6371.0 * 2 * asin(sqrt(least(1.0, greatest(0.0,
      power(sin(radians(${bloodBanks.latitude} - ${q.latitude}) / 2), 2) + cos(radians(${q.latitude})) * cos(radians(${bloodBanks.latitude})) * power(sin(radians(${bloodBanks.longitude} - ${q.longitude}) / 2), 2)
    )))))`.mapWith(Number);
    const [items, missing] = await Promise.all([
      this.database.db
        .select({ bank: bloodBanks, distanceKm: distance })
        .from(bloodBanks)
        .where(
          and(
            ...filters,
            isNotNull(bloodBanks.latitude),
            isNotNull(bloodBanks.longitude),
            lte(distance, q.radiusKm),
          ),
        )
        .orderBy(asc(distance), asc(bloodBanks.id))
        .limit(q.limit + 1)
        .offset((q.page - 1) * q.limit),
      this.database.db
        .select({ count: count() })
        .from(bloodBanks)
        .where(and(...filters, or(isNull(bloodBanks.latitude), isNull(bloodBanks.longitude)))),
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
      .from(bloodBanks)
      .where(eq(bloodBanks.id, id))
      .limit(1);
    if (!row) throw new NotFoundException('Blood bank not found.');
    return row;
  }
  async save(kind: DirectoryKind, id: string | null, body: unknown) {
    if (id) this.parse(z.uuid(), id);
    if (kind === 'articles') {
      const value = this.parse(articleInput, body);
      await this.database.db
        .insert(articleCategories)
        .values({ name: value.category })
        .onConflictDoNothing();
      const rows = id
        ? await this.database.db
            .update(articles)
            .set({ ...value, updated_at: new Date() })
            .where(eq(articles.id, id))
            .returning()
        : await this.database.db
            .insert(articles)
            .values({ ...value, source_id: `manual-${randomUUID()}` })
            .returning();
      if (!rows[0]) throw new NotFoundException();
      return rows[0];
    }
    const value = this.parse(bankInput, body);
    const rows = id
      ? await this.database.db
          .update(bloodBanks)
          .set({ ...value, updated_at: new Date() })
          .where(eq(bloodBanks.id, id))
          .returning()
      : await this.database.db
          .insert(bloodBanks)
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
            .delete(articles)
            .where(eq(articles.id, id))
            .returning({ id: articles.id })
        : await this.database.db
            .delete(bloodBanks)
            .where(eq(bloodBanks.id, id))
            .returning({ id: bloodBanks.id });
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
            .select({ id: articles.id })
            .from(articles)
            .where(inArray(articles.source_id, ids))
        : await this.database.db
            .select({ id: bloodBanks.id })
            .from(bloodBanks)
            .where(inArray(bloodBanks.source_id, ids));
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
            .insert(articleCategories)
            .values(category)
            .onConflictDoUpdate({
              target: articleCategories.name,
              set: { ...metadata, ...(image_url ? { image_url } : {}), updated_at: new Date() },
            });
        }
        for (const name of new Set(result.articles.map((row) => row.category)))
          await tx.insert(articleCategories).values({ name }).onConflictDoNothing();
        for (const row of result.articles)
          await tx
            .insert(articles)
            .values(row)
            .onConflictDoUpdate({
              target: articles.source_id,
              set: { ...row, ...(row.image_url ? {} : { image_url: sql`${articles.image_url}` }) },
            });
      } else
        for (const row of result.banks) {
          const { is_active: _active, ...updates } = row;
          void _active;
          await tx
            .insert(bloodBanks)
            .values(row)
            .onConflictDoUpdate({
              target: bloodBanks.source_id,
              set: { ...updates, updated_at: new Date() },
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
