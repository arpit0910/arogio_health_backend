import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { and, count, desc, eq, sum } from 'drizzle-orm';
import { z } from 'zod';
import { DatabaseService } from '../../../database/database.service';
import { wellnessPracticeHistory as history, wellnessPublicationVersions as versions } from '../../../database/schema';

const completion = z.object({
  attemptId: z.uuid(),
  itemId: z.uuid(),
  version: z.number().int().positive().max(2147483647),
  elapsedSeconds: z.number().int().positive().max(3600),
}).strict();

@Injectable()
export class PracticeHistoryService {
  constructor(private readonly database: DatabaseService) {}

  async complete(userId: string, body: unknown) {
    const parsed = completion.safeParse(body);
    if (!parsed.success) throw new BadRequestException('Invalid practice completion.');
    const input = parsed.data;
    const db = this.database.db;
    const [publication] = await db.select({ manifest: versions.manifest })
      .from(versions).where(and(eq(versions.itemId, input.itemId), eq(versions.version, input.version)));
    if (!publication || publication.manifest.kind !== 'practice')
      throw new NotFoundException('Practice version not found.');
    if (publication.manifest.durationSeconds !== input.elapsedSeconds)
      throw new BadRequestException('Completion time must match the selected practice version.');

    const [created] = await db.insert(history).values({ ...input, userId }).onConflictDoNothing()
      .returning({ attemptId: history.attemptId, completedAt: history.completedAt });
    if (created) return created;

    const [existing] = await db.select().from(history)
      .where(and(eq(history.userId, userId), eq(history.attemptId, input.attemptId)));
    if (!existing || existing.itemId !== input.itemId || existing.version !== input.version)
      throw new ConflictException('This practice attempt is already used.');
    return { attemptId: existing.attemptId, completedAt: existing.completedAt };
  }

  async list(userId: string) {
    const db = this.database.db;
    const [totals, rows] = await Promise.all([
      db.select({ sessions: count(), seconds: sum(history.elapsedSeconds) }).from(history).where(eq(history.userId, userId)),
      db.select({
        id: history.attemptId,
        version: history.version,
        elapsedSeconds: history.elapsedSeconds,
        completedAt: history.completedAt,
        manifest: versions.manifest,
      }).from(history).innerJoin(versions, and(eq(history.itemId, versions.itemId), eq(history.version, versions.version)))
        .where(eq(history.userId, userId)).orderBy(desc(history.completedAt), desc(history.attemptId)).limit(50),
    ]);
    return {
      totalSessions: totals[0]?.sessions ?? 0,
      totalSeconds: Number(totals[0]?.seconds ?? 0),
      items: rows.map(({ manifest, ...row }) => ({
        ...row, title_en: manifest.title_en, title_hi: manifest.title_hi,
      })),
    };
  }
}
