import { Body, Controller, Get, Header, HttpCode, Param, Post, Query } from '@nestjs/common';
import { DirectoryService } from './directory.service';
@Controller('public')
export class PublicDirectoryController {
  constructor(private readonly directory: DirectoryService) {}
  @Get('articles') articles(@Query() query: unknown) {
    return this.directory.listArticles(query);
  }
  @Get('article-categories') categories() {
    return this.directory.categories();
  }
  @Get('articles/:id') article(@Param('id') id: string) {
    return this.directory.article(id);
  }
  @Get('blood-banks') banks(@Query() query: unknown) {
    return this.directory.listBanks(query, false, true);
  }
  @Post('blood-banks/nearby') @HttpCode(200) @Header('Cache-Control', 'private, no-store') nearby(
    @Body() body: unknown,
  ) {
    return this.directory.nearby(body, true);
  }
}
