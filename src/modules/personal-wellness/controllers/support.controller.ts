import { BadRequestException, Body, ConflictException, Controller, Get, Header, Param, Put, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { z } from 'zod';
import { and, desc, eq } from 'drizzle-orm';
import { JwtAuthGuard } from '../../../common/authentication/jwt-auth.guard';
import { CurrentUser } from '../../../common/authentication/current-user.decorator';
import type { RequestUser } from '../../../common/authentication/request-user';
import { DatabaseService } from '../../../database/database.service';
import { supportFeedback } from '../../../database/schema/support-feedback.schema';

@UseGuards(JwtAuthGuard)
@Controller('support')
export class SupportController {
  constructor(private readonly database: DatabaseService) {}
  @Get('feedback')
  @Header('Cache-Control', 'private, no-store')
  list(@CurrentUser() user: RequestUser) {
    return this.database.db.select().from(supportFeedback).where(eq(supportFeedback.userId, user.userId)).orderBy(desc(supportFeedback.createdAt)).limit(30);
  }
  @Put('feedback/:id')
  @Header('Cache-Control', 'private, no-store')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async create(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() body: unknown) {
    const input = z.object({ subject: z.string().trim().min(3).max(120), message: z.string().trim().min(10).max(2000) }).strict().safeParse(body);
    if (!z.uuid().safeParse(id).success || !input.success) throw new BadRequestException('Enter a subject and a message of 10–2,000 characters.');
    const value = { id, userId: user.userId, ...input.data };
    const [inserted] = await this.database.db.insert(supportFeedback).values(value).onConflictDoNothing().returning();
    if (inserted) return inserted;
    const [existing] = await this.database.db.select().from(supportFeedback).where(and(eq(supportFeedback.id, id), eq(supportFeedback.userId, user.userId)));
    if (!existing || existing.subject !== value.subject || existing.message !== value.message) throw new ConflictException('This feedback ID is already in use. Start a new message.');
    return existing;
  }
}
