import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/authentication/jwt-auth.guard';
import { CurrentUser } from '../../../common/authentication/current-user.decorator';
import type { RequestUser } from '../../../common/authentication/request-user';
import { MeditationLibraryService } from '../../meditation-library/services/meditation-library.service';
import { SuperAdministratorGuard } from '../guards/administration.guard';
import { AdministrationService } from '../services/administration.service';
@Controller('admin/meditation')
@UseGuards(JwtAuthGuard, SuperAdministratorGuard)
export class MeditationLibraryAdministrationController {
  constructor(
    private readonly meditation: MeditationLibraryService,
    private readonly audit: AdministrationService,
  ) {}
  @Get() list(@Query() query: unknown) {
    return this.meditation.list(query, true);
  }
  @Get(':id/versions')
  publicationHistory(@Param('id') id: string) {
    return this.meditation.publicationHistory(id);
  }
  @Get(':id') get(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.meditation.get(id);
  }
  @Post() create(@CurrentUser() user: RequestUser, @Body() body: unknown) {
    return this.audit.audit(user.userId, 'meditation.create', null, () =>
      this.meditation.save(null, user.userId, body),
    );
  }
  @Patch(':id') update(
    @CurrentUser() user: RequestUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: unknown,
  ) {
    return this.audit.audit(user.userId, 'meditation.update', id, () =>
      this.meditation.save(id, user.userId, body),
    );
  }
  @Delete(':id') remove(
    @CurrentUser() user: RequestUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.audit.audit(user.userId, 'meditation.delete', id, () => this.meditation.remove(id));
  }
}
