import { Controller, Get, Header } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { RequestActivityService } from './request-activity.service';

@ApiExcludeController()
@Controller()
export class StatusController {
  constructor(private readonly activity: RequestActivityService) {}

  @Get('diagnostics')
  @Header('Cache-Control', 'no-store')
  diagnostics() {
    return this.activity.snapshot();
  }

  @Get('diagnostics/ping')
  @Header('Cache-Control', 'no-store')
  ping() {
    return { service: 'arogio-health-api', status: 'ok', timestamp: new Date().toISOString() };
  }
}
