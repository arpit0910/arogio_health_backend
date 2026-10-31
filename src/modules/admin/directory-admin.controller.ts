import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
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
import { DirectoryService } from '../directory/directory.service';
import { SuperAdminGuard } from './admin.guard';
import { AdminService } from './admin.service';
import type { Response } from 'express';
import { Workbook } from 'exceljs';
import { articleHeaders, bankHeaders } from '../directory/import';
const upload = FileInterceptor('file', {
  limits: { fileSize: 8 * 1024 * 1024, files: 1, fields: 0 },
});
@Controller('admin/content')
@UseGuards(JwtAuthGuard, SuperAdminGuard)
export class DirectoryAdminController {
  constructor(
    private readonly directory: DirectoryService,
    private readonly audit: AdminService,
  ) {}
  @Get(':kind') list(@Param('kind') kind: string, @Query() query: unknown) {
    return this.directory.adminList(this.directory.kind(kind), query);
  }
  @Get(':kind/template') async template(@Param('kind') kind: string, @Res() response: Response) {
    const type = this.directory.kind(kind),
      headers = type === 'articles' ? articleHeaders : bankHeaders;
    const workbook = new Workbook(),
      sheet = workbook.addWorksheet(type === 'articles' ? 'Articles' : 'Blood banks');
    sheet.columns = headers.map((header) => ({
      header,
      key: header,
      width: /content|address/.test(header) ? 48 : 24,
      style: { numFmt: '@' },
    }));
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF126349' } };
    sheet.views = [{ state: 'frozen', ySplit: 1 }];
    response.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    response.setHeader('Content-Disposition', `attachment; filename="${type}-template.xlsx"`);
    response.setHeader('Cache-Control', 'private, no-store');
    response.send(Buffer.from(await workbook.xlsx.writeBuffer()));
  }
  @Get(':kind/:id') get(@Param('kind') kind: string, @Param('id') id: string) {
    return this.directory.kind(kind) === 'articles'
      ? this.directory.article(id, true)
      : this.directory.bank(id);
  }
  @Post(':kind/import/preview')
  @UseInterceptors(upload)
  preview(@Param('kind') kind: string, @UploadedFile() file?: Express.Multer.File) {
    return this.directory.preview(this.directory.kind(kind), file);
  }
  @Post(':kind/import/apply')
  @UseInterceptors(upload)
  import(
    @CurrentUser() user: RequestUser,
    @Param('kind') kind: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const type = this.directory.kind(kind);
    return this.audit.audit(user.userId, `${type}.import`, null, () =>
      this.directory.import(type, file),
    );
  }
  @Post(':kind') create(
    @CurrentUser() user: RequestUser,
    @Param('kind') kind: string,
    @Body() body: unknown,
  ) {
    const type = this.directory.kind(kind);
    return this.audit.audit(user.userId, `${type}.create`, null, () =>
      this.directory.save(type, null, body),
    );
  }
  @Patch(':kind/:id') update(
    @CurrentUser() user: RequestUser,
    @Param('kind') kind: string,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const type = this.directory.kind(kind);
    return this.audit.audit(user.userId, `${type}.update`, id, () =>
      this.directory.save(type, id, body),
    );
  }
  @Delete(':kind/:id') remove(
    @CurrentUser() user: RequestUser,
    @Param('kind') kind: string,
    @Param('id') id: string,
  ) {
    const type = this.directory.kind(kind);
    return this.audit.audit(user.userId, `${type}.delete`, id, () =>
      this.directory.remove(type, id),
    );
  }
}
