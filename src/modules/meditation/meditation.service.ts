import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, count, eq, ilike, or, type SQL } from 'drizzle-orm';
import { z } from 'zod';
import { DatabaseService } from '../../database/database.service';
import { meditationContent as content } from '../../database/schema';
import { meditationInput, meditationListInput, youtubeVideoId } from './meditation.input';

@Injectable()
export class MeditationService {
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
  async get(id: string) {
    const uuid = this.parse(z.uuid(), id);
    const [row] = await this.database.db
      .select()
      .from(content)
      .where(eq(content.id, uuid))
      .limit(1);
    if (!row) throw new NotFoundException('Meditation content not found');
    return this.present(row, true);
  }
  async save(id: string | null, actor: string, body: unknown) {
    const data = this.parse(meditationInput, body);
    const { youtubeUrl, expectedUpdatedAt, ...values } = data;
    const record = {
      ...values,
      videoId: data.kind === 'video' ? youtubeVideoId(youtubeUrl) : null,
      durationSeconds:
        data.kind === 'practice'
          ? data.steps.reduce((sum, step) => sum + step.seconds, 0) * data.repeat
          : data.durationSeconds,
      updatedAt: new Date(),
    };
    if (!id) {
      const [row] = await this.database.db
        .insert(content)
        .values({ ...record, createdBy: actor })
        .returning();
      return this.present(row!, true);
    }
    const uuid = this.parse(z.uuid(), id);
    if (!expectedUpdatedAt)
      throw new BadRequestException('Reload the content before saving changes.');
    const [row] = await this.database.db
      .update(content)
      .set(record)
      .where(and(eq(content.id, uuid), eq(content.updatedAt, new Date(expectedUpdatedAt))))
      .returning();
    if (!row) {
      await this.get(uuid);
      throw new ConflictException('This content changed. Reload it before saving.');
    }
    return this.present(row, true);
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
