import type { Response } from 'express';
import { sendProviderImage } from '../../../common/media/provider-image';
import { Body, Controller, Get, Header, HttpCode, Param, Post, Query, Res } from '@nestjs/common';
import { HealthResourcesService } from '../services/health-resources.service';
@Controller('public')
export class PublicHealthResourcesController {
  constructor(private readonly directory: HealthResourcesService) {}
  @Get('articles') articles(@Query() query: unknown) {
    return this.directory.listArticles(query);
  }
  @Get('article-categories') categories() {
    return this.directory.categories();
  }
  @Get('articles/:id/thumbnail') async thumbnail(@Param('id') id: string, @Res() response: Response) {
    sendProviderImage(response, await this.directory.articleThumbnail(id));
  }
  @Get('articles/:id') article(@Param('id') id: string) {
    return this.directory.article(id);
  }
  @Get('blood-banks') banks(@Query() query: unknown) {
    return this.directory.listBanks(query);
  }
  @Get('blood-banks/:id/image') async bankImage(@Param('id') id: string, @Res() response: Response) {
    sendProviderImage(response, await this.directory.bankImage(id));
  }
  @Post('blood-banks/nearby') @HttpCode(200) @Header('Cache-Control', 'private, no-store') nearby(
    @Body() body: unknown,
  ) {
    return this.directory.nearby(body);
  }
}
