import { Controller, Get, Header, Param, ParseUUIDPipe, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import type { RequestUser } from '../../common/auth/request-user';
import { HomeService } from './home.service';
@Controller('home')
export class HomeController {
  constructor(private readonly home: HomeService) {}
  @Get('banners') @Header('Cache-Control', 'no-cache') banners() {
    return this.home.banners();
  }
  @Get('banners/:id/image') async image(
    @Param('id', ParseUUIDPipe) id: string,
    @Res() response: Response,
  ) {
    const banner = await this.home.image(id);
    response.setHeader('Content-Type', 'image/webp');
    response.setHeader('Cache-Control', 'public, max-age=300');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.send(banner.image);
  }
  @Get('weather') @UseGuards(JwtAuthGuard) @Header('Cache-Control', 'private, no-store') weather(
    @CurrentUser() user: RequestUser,
  ) {
    return this.home.weather(user.userId);
  }
}
