import { Controller, Get, Header, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/authentication/jwt-auth.guard';
import { MeditationLibraryService } from '../services/meditation-library.service';
@Controller('meditation')
@UseGuards(JwtAuthGuard)
export class MeditationLibraryController {
  constructor(private readonly meditation: MeditationLibraryService) {}
  @Get('content') @Header('Cache-Control', 'private, no-cache') list(@Query() query: unknown) {
    return this.meditation.list(query);
  }
}
@Controller('public/meditation')
export class PublicMeditationLibraryController {
  constructor(private readonly meditation: MeditationLibraryService) {}
  @Get('content') @Header('Cache-Control', 'no-cache') list(@Query() query: unknown) { return this.meditation.list(query); }
}
