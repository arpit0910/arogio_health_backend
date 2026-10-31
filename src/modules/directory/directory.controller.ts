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
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { DirectoryService } from './directory.service';
@UseGuards(JwtAuthGuard)
@Controller()
export class DirectoryController {
  constructor(private readonly directory: DirectoryService) {}
  @Get('articles') articles(@Query() query: unknown) {
    return this.directory.listArticles(query);
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
