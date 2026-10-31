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
import { articles, bloodBanks } from '../../database/schema';
import {
  articleInput,
  bankInput,
  listInput,
  nearbyInput,
  type DirectoryKind,
} from './directory.input';
import { prepareImport } from './import';
import { workbookToCsv } from './workbook';

const articleSummary = {
  id: articles.id,
  source_id: articles.source_id,
  title_en: articles.title_en,
  title_hi: articles.title_hi,
  excerpt_en: articles.excerpt_en,
  excerpt_hi: articles.excerpt_hi,
  category: articles.category,
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
        )!,
      );
    if (q.category) conditions.push(eq(articles.category, q.category));
    const [items, categories] = await Promise.all([
      this.database.db
        .select(articleSummary)
        .from(articles)
        .where(and(...conditions))
        .orderBy(desc(articles.created_at), asc(articles.id))
        .limit(q.limit + 1)
        .offset((q.page - 1) * q.limit),
      this.database.db
        .selectDistinct({ category: articles.category })
        .from(articles)
        .where(admin ? undefined : eq(articles.is_published, true))
        .orderBy(asc(articles.category)),
    ]);
    return {
      items: items.slice(0, q.limit),
      page: q.page,
      hasNext: items.length > q.limit,
      categories: categories.map((item) => item.category),
    };
  }
  async article(id: string, admin = false) {
    this.parse(z.uuid(), id);
    const [row] = await this.database.db
      .select()
      .from(articles)
      .where(and(eq(articles.id, id), admin ? undefined : eq(articles.is_published, true)))
      .limit(1);
    if (!row) throw new NotFoundException('Article not found.');
    return row;
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
      const buffer = name.endsWith('.xlsx') ? await workbookToCsv(file.buffer) : file.buffer;
      return prepareImport(kind, buffer);
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
      if (kind === 'articles')
        for (const row of result.articles)
          await tx
            .insert(articles)
            .values(row)
            .onConflictDoUpdate({ target: articles.source_id, set: row });
      else
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
      missingCoordinates: result.banks.filter((row) => row.latitude == null).length,
    };
  }
}
