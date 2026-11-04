import { Controller, Get, Header, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { MeditationService } from './meditation.service';
@Controller('meditation')
@UseGuards(JwtAuthGuard)
export class MeditationController {
  constructor(private readonly meditation: MeditationService) {}
  @Get('content') @Header('Cache-Control', 'private, no-cache') list(@Query() query: unknown) {
    return this.meditation.list(query);
  }
}
