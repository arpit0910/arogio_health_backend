import { eq, desc } from 'drizzle-orm';
import { DatabaseService } from '../../../database/database.service';
import { supportFeedback } from '../../../database/schema';
import { Controller, Get, Header, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../../../common/authentication/current-user.decorator';
import type { RequestUser } from '../../../common/authentication/request-user';
import { JwtAuthGuard } from '../../../common/authentication/jwt-auth.guard';
import { UserAccountsService } from '../../user-accounts/services/user-accounts.service';
import { PersonalWellnessService } from '../services/personal-wellness.service';
@Controller('profile/export')
@UseGuards(JwtAuthGuard)
export class ExportController {
  constructor(
    private readonly database: DatabaseService,
    private readonly users: UserAccountsService,
    private readonly wellness: PersonalWellnessService,
  ) {}
  @Get()
  @Header('Cache-Control', 'private, no-store')
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  async get(@CurrentUser() user: RequestUser) {
    const [feedback, profile, wellness] = await Promise.all([
      this.database.db.select().from(supportFeedback).where(eq(supportFeedback.userId, user.userId)).orderBy(desc(supportFeedback.createdAt)).limit(1000),
      this.users.getMe(user.userId),
      this.wellness.snapshot(user.userId),
    ]);
    return {
      exportedAt: new Date().toISOString(),
      scope:
        'Profile, retained wellness snapshot and up to 1,000 recent support feedback records. Water and medicine dose history is limited to 90 days. Device readings and chat are not included.',
      profile,
      wellness,
      feedback,
    };
  }
}
