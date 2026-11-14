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
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import type { RequestUser } from '../../common/auth/request-user';
import { MeditationService } from '../meditation/meditation.service';
import { SuperAdminGuard } from './admin.guard';
import { AdminService } from './admin.service';
@Controller('admin/meditation')
@UseGuards(JwtAuthGuard, SuperAdminGuard)
export class MeditationAdminController {
  constructor(
    private readonly meditation: MeditationService,
    private readonly audit: AdminService,
  ) {}
  @Get() list(@Query() query: unknown) {
    return this.meditation.list(query, true);
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
