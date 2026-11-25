import { sendProviderImage } from '../../../common/media/provider-image';
import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  Param,
  Patch,
  Put,
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
import { HospitalsService } from '../services/hospitals.service';
import { hospitalHeaders } from '../imports/hospitals.import';

const upload = FileInterceptor('file', {
  limits: { fileSize: 8 * 1024 * 1024, files: 1, fields: 1, fieldSize: 4096 },
});
@Controller('public/hospitals')
export class PublicHospitalsController {
  constructor(private readonly service: HospitalsService) {}
  @Get() list(@Query() query: unknown) {
    return this.service.list(query);
  }
  @Post('nearby')
  @HttpCode(200)
  @Header('Cache-Control', 'private, no-store')
  nearby(@Body() body: unknown) {
    return this.service.nearby(body);
  }
  @Get(':id/image') async image(@Param('id') id: string, @Res() response: Response) {
    sendProviderImage(response, await this.service.image(id));
  }
  @Get(':id') detail(@Param('id') id: string) {
    return this.service.detail(id);
  }
}

@Controller('admin/hospitals')
@UseGuards(JwtAuthGuard, SuperAdministratorGuard)
export class HospitalsAdministrationController {
  constructor(private readonly service: HospitalsService) {}
  @Get(':id/image') async image(@Param('id') id: string, @Res() response: Response) {
    sendProviderImage(response, await this.service.image(id, true));
  }
  @Put(':id/image')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 4 * 1024 * 1024, files: 1, fields: 2, fieldSize: 1024 },
    }),
  )
  uploadImage(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() body: unknown,
  ) {
    return this.service.uploadImage(user.userId, id, file, body);
  }
  @Delete(':id/image') removeImage(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Query() query: unknown,
  ) {
    return this.service.removeImage(user.userId, id, query);
  }
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
        .attachment('hospitals-template.csv')
        .send('\uFEFF' + hospitalHeaders.join(',') + '\r\n');
      return;
    }
    const workbook = new Workbook(),
      sheet = workbook.addWorksheet('Hospitals');
    sheet.columns = hospitalHeaders.map((header) => ({
      header,
      key: header,
      width: 30,
      style: { numFmt: '@' },
    }));
    sheet.views = [{ state: 'frozen', ySplit: 1 }];
    sheet.getRow(1).font = { bold: true };
    response
      .type('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      .attachment('hospitals-template.xlsx')
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
  @Post(':id/visibility')
  visibility(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() body: unknown) {
    return this.service.visibility(user.userId, id, body);
  }
  @Post(':id/review')
  review(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() body: unknown) {
    return this.service.review(user.userId, id, body);
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
