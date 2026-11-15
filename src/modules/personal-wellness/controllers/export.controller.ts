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
    private readonly users: UserAccountsService,
    private readonly wellness: PersonalWellnessService,
  ) {}
  @Get()
  @Header('Cache-Control', 'private, no-store')
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  async get(@CurrentUser() user: RequestUser) {
    const [profile, wellness] = await Promise.all([
      this.users.getMe(user.userId),
      this.wellness.snapshot(user.userId),
    ]);
    return {
      exportedAt: new Date().toISOString(),
      scope:
        'Profile and retained wellness snapshot. Water and medicine dose history is limited to 90 days. Device readings and chat are not included.',
      profile,
      wellness,
    };
  }
}
