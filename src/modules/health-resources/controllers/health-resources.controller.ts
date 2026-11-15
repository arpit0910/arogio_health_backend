import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/authentication/jwt-auth.guard';
import { HealthResourcesService } from '../services/health-resources.service';
@UseGuards(JwtAuthGuard)
@Controller()
export class HealthResourcesController {
  constructor(private readonly directory: HealthResourcesService) {}
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
    return this.directory.listBanks(query);
  }
  @Post('blood-banks/nearby') @HttpCode(200) @Header('Cache-Control', 'private, no-store') nearby(
    @Body() body: unknown,
  ) {
    return this.directory.nearby(body);
  }
}
