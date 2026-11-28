import { Body, Controller, Get, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../../../common/authentication/jwt-auth.guard';
import { SuperAdministratorGuard } from '../../administration/guards/administration.guard';
import { CurrentUser } from '../../../common/authentication/current-user.decorator';
import type { RequestUser } from '../../../common/authentication/request-user';
import { CareDirectoryService } from '../services/care-directory.service';
import { HealthResourcesService } from '../../health-resources/services/health-resources.service';
import { z } from 'zod';
import { BadRequestException } from '@nestjs/common';

@Controller('care-search')
export class CareDirectorySearchController {
  constructor(
    private readonly care: CareDirectoryService,
    private readonly directory: HealthResourcesService,
  ) {}
  @Get() async search(@Query() query: unknown) {
    const q = z
      .object({ search: z.string().trim().max(150).default('') })
      .strict()
      .safeParse(query);
    if (!q.success) throw new BadRequestException('Search must be at most 150 characters.');
    const search = q.data.search.normalize('NFC');
    const [providers, articles, bloodBanks] = await Promise.all([
      this.care.list({ search, limit: 10 }),
      this.directory.listArticles({ search, limit: 5 }),
      this.directory.listBanks({ search, limit: 5 }, false, true),
    ]);
    return { providers, articles, bloodBanks };
  }
}
@Controller('care')
export class CareDirectoryController {
  constructor(private readonly service: CareDirectoryService) {}
  @Post('blood-banks/:id/corrections') @Throttle({ default: { limit: 5, ttl: 60000 } }) reportBank(
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.service.reportBank(id, body);
  }
  @Get() list(@Query() query: unknown) {
    return this.service.list(query);
  }
  @Get(':id') detail(@Param('id') id: string) {
    return this.service.detail(id);
  }
  @Post(':id/corrections') @Throttle({ default: { limit: 5, ttl: 60000 } }) report(
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.service.report(id, body);
  }
}
@Controller('admin/care')
@UseGuards(JwtAuthGuard, SuperAdministratorGuard)
export class CareDirectoryAdministrationController {
  constructor(private readonly service: CareDirectoryService) {}
  @Post('blood-banks/:id/review') reviewBank(
    @Param('id') id: string,
    @CurrentUser() u: RequestUser,
    @Body() body: unknown,
  ) {
    return this.service.reviewBank(id, u.userId, body);
  }
  @Get() list(@Query() query: unknown) {
    return this.service.list(query, true);
  }
  @Get('corrections') queue() {
    return this.service.correctionQueue();
  }
  @Patch('corrections/:id') resolve(
    @Param('id') id: string,
    @CurrentUser() u: RequestUser,
    @Body() body: unknown,
  ) {
    return this.service.resolve(id, u.userId, body);
  }
  @Get(':id') detail(@Param('id') id: string) {
    return this.service.detail(id, true);
  }
  @Post() create(@CurrentUser() u: RequestUser, @Body() body: unknown) {
    return this.service.save(null, u.userId, body);
  }
  @Put(':id') save(@Param('id') id: string, @CurrentUser() u: RequestUser, @Body() body: unknown) {
    return this.service.save(id, u.userId, body);
  }
  @Post(':id/review') review(
    @Param('id') id: string,
    @CurrentUser() u: RequestUser,
    @Body() body: unknown,
  ) {
    return this.service.review(id, u.userId, body);
  }
  @Put(':id/affiliations') affiliations(
    @Param('id') id: string,
    @CurrentUser() u: RequestUser,
    @Body() body: unknown,
  ) {
    return this.service.affiliations(id, u.userId, body);
  }
}
