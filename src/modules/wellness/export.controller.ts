import { Controller, Get, Header, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import type { RequestUser } from '../../common/auth/request-user';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { UsersService } from '../users/users.service';
import { WellnessService } from './wellness.service';
@Controller('profile/export')
@UseGuards(JwtAuthGuard)
export class ExportController {
  constructor(
    private readonly users: UsersService,
    private readonly wellness: WellnessService,
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
        'Profile and retained wellness snapshot. Water history is limited to 90 days. Device readings and chat are not included.',
      profile,
      wellness,
    };
  }
}
