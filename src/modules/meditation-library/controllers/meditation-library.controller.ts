import { Body, Controller, Get, Header, Param, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../../common/authentication/current-user.decorator';
import type { RequestUser } from '../../../common/authentication/request-user';
import { PracticeHistoryService } from '../services/practice-history.service';
import { JwtAuthGuard } from '../../../common/authentication/jwt-auth.guard';
import { MeditationLibraryService } from '../services/meditation-library.service';
@Controller('meditation')
@UseGuards(JwtAuthGuard)
export class MeditationLibraryController {
  constructor(private readonly meditation: MeditationLibraryService, private readonly progress: PracticeHistoryService) {}
  @Get('content') @Header('Cache-Control', 'private, no-cache') list(@Query() query: unknown) {
    return this.meditation.list(query);
  }
  @Get('progress') @Header('Cache-Control', 'private, no-store')
  history(@CurrentUser() user: RequestUser) { return this.progress.list(user.userId); }
  @Post('progress') @Header('Cache-Control', 'private, no-store')
  complete(@CurrentUser() user: RequestUser, @Body() body: unknown) { return this.progress.complete(user.userId, body); }
}
@Controller('public/meditation')
export class PublicMeditationLibraryController {
  constructor(private readonly meditation: MeditationLibraryService) {}
  @Get('content') @Header('Cache-Control', 'no-cache') list(@Query() query: unknown) { return this.meditation.list(query); }
  @Get('content/:id') @Header('Cache-Control', 'no-cache') detail(@Param('id') id: string) {
    return this.meditation.get(id, false);
  }
}
