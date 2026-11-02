import type { Response } from 'express';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Patch,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import type { RequestUser } from '../../common/auth/request-user';
import { SuperAdminGuard } from './admin.guard';
import { AdminService } from './admin.service';
@Controller('admin')
@UseGuards(JwtAuthGuard, SuperAdminGuard)
export class AdminController {
  constructor(private readonly service: AdminService) {}
  @Get('me') me(@CurrentUser() u: RequestUser) {
    return { id: u.userId, role: 'super_admin' };
  }
  @Get('analytics') analytics() {
    return this.service.analytics();
  }
  @Get('users') users(@Query() query: unknown) {
    return this.service.listUsers(query);
  }
  @Post('users') create(@CurrentUser() u: RequestUser, @Body() body: unknown) {
    return this.service.audit(u.userId, 'account.create', null, () =>
      this.service.createUser(body),
    );
  }
  @Get('users/:id') user(@CurrentUser() u: RequestUser, @Param('id') id: string) {
    return this.service.audit(u.userId, 'account.view', id, () => this.service.user(id));
  }
  @Patch('users/:id') update(
    @CurrentUser() u: RequestUser,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.service.audit(u.userId, 'account.update', id, () =>
      this.service.updateUser(id, body),
    );
  }
  @Post('users/:id/action') action(
    @CurrentUser() u: RequestUser,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.service.audit(u.userId, 'account.status', id, () =>
      this.service.accountAction(u.userId, id, body),
    );
  }
  @Get('users/:id/records/:type') records(
    @CurrentUser() u: RequestUser,
    @Param('id') id: string,
    @Param('type') type: string,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
  ) {
    return this.service.audit(u.userId, 'records.view', id, () =>
      this.service.records(id, type, page),
    );
  }
  @Post('users/:id/tracking') tracking(
    @CurrentUser() u: RequestUser,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.service.audit(u.userId, 'tracking.change', id, () =>
      this.service.mutateWellness(id, body),
    );
  }
  @Get('banners/:id/image') async image(@Param('id') id: string, @Res() response: Response) {
    response.setHeader('Cache-Control', 'private, no-store');
    response.type('webp').send(await this.service.image(id));
  }
  @Get('banners') banners() {
    return this.service.listBanners();
  }
  @Post('banners')
  @UseInterceptors(
    FileInterceptor('image', { limits: { fileSize: 4 * 1024 * 1024, files: 1, fields: 3 } }),
  )
  upload(
    @CurrentUser() u: RequestUser,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() body: unknown,
  ) {
    return this.service.audit(u.userId, 'banner.upload', null, () =>
      this.service.upload(u.userId, file, body),
    );
  }
  @Patch('banners/:id') banner(
    @CurrentUser() u: RequestUser,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.service.audit(u.userId, 'banner.update', id, () =>
      this.service.updateBanner(id, body),
    );
  }
  @Delete('banners/:id') remove(@CurrentUser() u: RequestUser, @Param('id') id: string) {
    return this.service.audit(u.userId, 'banner.delete', id, () => this.service.deleteBanner(id));
  }
  @Get('audit') audit(@Query('page', new ParseIntPipe({ optional: true })) page?: number) {
    return this.service.auditLog(page);
  }
}
