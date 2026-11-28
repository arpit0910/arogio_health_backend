import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, count, desc, eq, ilike, or, sql, type SQL } from 'drizzle-orm';
import { z } from 'zod';
import { DatabaseService } from '../../../database/database.service';
import { meditationLibraryItems as content, wellnessPublicationVersions as versions } from '../../../database/schema';
import { meditationInput, meditationListInput, youtubeVideoId } from '../requests/meditation-library.input';

@Injectable()
export class MeditationLibraryService {
  constructor(private readonly database: DatabaseService) {}
  private parse<T>(schema: z.ZodType<T>, value: unknown): T {
    const result = schema.safeParse(value);
    if (!result.success)
      throw new BadRequestException(
        result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; '),
      );
    return result.data;
  }
  async list(query: unknown, admin = false) {
    const q = this.parse(meditationListInput, query);
    const conditions: SQL[] = admin ? [] : [eq(content.published, true)];
    if (q.search)
      conditions.push(
        or(ilike(content.title_en, `%${q.search}%`), ilike(content.title_hi, `%${q.search}%`))!,
      );
    if (q.section) conditions.push(eq(content.section, q.section));
    if (q.kind) conditions.push(eq(content.kind, q.kind));
    const [rows, totals] = await Promise.all([
      this.database.db
        .select()
        .from(content)
        .where(and(...conditions))
        .orderBy(asc(content.sortOrder), asc(content.id))
        .limit(q.limit + 1)
        .offset((q.page - 1) * q.limit),
      this.database.db
        .select({ value: count() })
        .from(content)
        .where(and(...conditions)),
    ]);
    return {
      items: rows.slice(0, q.limit).map((row) => this.present(row, admin)),
      page: q.page,
      hasNext: rows.length > q.limit,
      total: totals[0]!.value,
    };
  }
  private present(row: typeof content.$inferSelect, admin: boolean) {
    const { createdBy, ...publicRow } = row;
    return admin
      ? {
          ...publicRow,
          createdBy,
          youtubeUrl: row.videoId ? `https://www.youtube.com/watch?v=${row.videoId}` : '',
        }
      : publicRow;
  }
  async get(id: string, admin = true) {
    const uuid = this.parse(z.uuid(), id);
    const [row] = await this.database.db
      .select()
      .from(content)
      .where(and(eq(content.id, uuid), admin ? undefined : eq(content.published, true)))
      .limit(1);
    if (!row) throw new NotFoundException('Meditation content not found');
    return this.present(row, admin);
  }
  async save(id: string | null, actor: string, body: unknown) {
    const data = this.parse(meditationInput, body);
    const { youtubeUrl, expectedUpdatedAt, ...values } = data;
    const record = {
      ...values,
      videoId: youtubeUrl ? youtubeVideoId(youtubeUrl) : null,
      durationSeconds:
        data.kind === 'practice'
          ? data.steps.reduce((sum, step) => sum + step.seconds, 0) * data.repeat
          : data.durationSeconds,
      updatedAt: new Date(),
    };
    const uuid = id ? this.parse(z.uuid(), id) : null;
    if (uuid && !expectedUpdatedAt)
      throw new BadRequestException('Reload the content before saving changes.');

    return this.database.db.transaction(async (tx) => {
      const [row] = uuid && expectedUpdatedAt
        ? await tx.update(content).set({
            ...record,
            publishedVersion: data.published ? sql`${content.publishedVersion} + 1` : undefined,
            updatedAt: sql`greatest(date_trunc('milliseconds', clock_timestamp()), ${content.updatedAt} + interval '1 millisecond')`,
          }).where(and(eq(content.id, uuid), eq(content.updatedAt, new Date(expectedUpdatedAt)))).returning()
        : await tx.insert(content).values({
            ...record, createdBy: actor, publishedVersion: data.published ? 1 : 0,
          }).returning();
      if (!row) {
        const [existing] = await tx.select({ id: content.id }).from(content).where(eq(content.id, uuid!));
        if (!existing) throw new NotFoundException('Meditation content not found');
        throw new ConflictException('This content changed. Reload it before saving.');
      }
      if (row.published) {
        await tx.insert(versions).values({
          itemId: row.id,
          version: row.publishedVersion,
          manifest: this.present(row, false),
          publishedBy: actor,
          publishedAt: row.updatedAt,
        });
      }
      return this.present(row, true);
    });
  }
  async publicationHistory(id: string) {
    const uuid = this.parse(z.uuid(), id);
    return this.database.db.select().from(versions).where(eq(versions.itemId, uuid))
      .orderBy(desc(versions.version));
  }
  async remove(id: string) {
    const uuid = this.parse(z.uuid(), id);
    const [row] = await this.database.db
      .delete(content)
      .where(eq(content.id, uuid))
      .returning({ id: content.id });
    if (!row) throw new NotFoundException('Meditation content not found');
    return { deleted: true };
  }
}
