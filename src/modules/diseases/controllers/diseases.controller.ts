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
import { Workbook } from 'exceljs';
import type { Response } from 'express';
import { JwtAuthGuard } from '../../../common/authentication/jwt-auth.guard';
import { CurrentUser } from '../../../common/authentication/current-user.decorator';
import type { RequestUser } from '../../../common/authentication/request-user';
import { SuperAdministratorGuard } from '../../administration/guards/administration.guard';
import { DiseasesService } from '../services/diseases.service';
import { diseaseHeaders } from '../imports/diseases.import';

const upload = FileInterceptor('file', {
  limits: { fileSize: 8 * 1024 * 1024, files: 1, fields: 1, fieldSize: 4096 },
});
@Controller('public/diseases')
export class PublicDiseasesController {
  constructor(private readonly service: DiseasesService) {}
  @Get() list(@Query() query: unknown) {
    return this.service.list(query);
  }
  @Get(':id') detail(@Param('id') id: string) {
    return this.service.detail(id);
  }
}

@Controller('admin/diseases')
@UseGuards(JwtAuthGuard, SuperAdministratorGuard)
export class DiseasesAdministrationController {
  constructor(private readonly service: DiseasesService) {}
  @Get() list(@Query() query: unknown) {
    return this.service.list(query, true);
  }
  @Get('template') async template(
    @Query('format') format: string | undefined,
    @Res() response: Response,
  ) {
    response.setHeader('Cache-Control', 'private, no-store');
    if (format === 'csv') {
      response
        .type('text/csv')
        .attachment('diseases-template.csv')
        .send('\uFEFF' + diseaseHeaders.join(',') + '\r\n');
      return;
    }
    const workbook = new Workbook(),
      sheet = workbook.addWorksheet('Diseases');
    sheet.columns = diseaseHeaders.map((header) => ({
      header,
      key: header,
      width: 30,
      style: { numFmt: '@' },
    }));
    sheet.views = [{ state: 'frozen', ySplit: 1 }];
    sheet.getRow(1).font = { bold: true };
    response
      .type('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      .attachment('diseases-template.xlsx')
      .send(Buffer.from(await workbook.xlsx.writeBuffer()));
  }
  @Post('import/preview')
  @UseInterceptors(upload)
  preview(@CurrentUser() user: RequestUser, @UploadedFile() file?: Express.Multer.File) {
    return this.service.preview(user.userId, file);
  }
  @Post('import/apply')
  @UseInterceptors(upload)
  apply(
    @CurrentUser() user: RequestUser,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body('previewToken') token: unknown,
  ) {
    return this.service.apply(user.userId, file, token);
  }
  @Get(':id') detail(@Param('id') id: string) {
    return this.service.detail(id, true);
  }
  @Post() create(@CurrentUser() user: RequestUser, @Body() body: unknown) {
    return this.service.create(user.userId, body);
  }
  @Patch(':id') update(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.service.update(user.userId, id, body);
  }
  @Delete(':id') remove(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Query() query: unknown,
  ) {
    return this.service.remove(user.userId, id, query);
  }
}
