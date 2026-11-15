import { Body, Controller, Header, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../../../common/authentication/jwt-auth.guard';
import { CurrentUser } from '../../../common/authentication/current-user.decorator';
import type { RequestUser } from '../../../common/authentication/request-user';
import { JeevaAssistantService } from '../services/jeeva-assistant.service';

@ApiTags('chat')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('chat')
export class JeevaAssistantController {
  constructor(private readonly chat: JeevaAssistantService) {}
  @Post('messages')
  @HttpCode(200)
  @Header('Cache-Control', 'private, no-store')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  reply(@CurrentUser() user: RequestUser, @Body() body: unknown) {
    return this.chat.reply(user.userId, body);
  }
}
