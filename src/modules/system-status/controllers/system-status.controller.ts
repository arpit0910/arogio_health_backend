import { Controller, Get, Header } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { RequestActivityService } from '../services/request-activity.service';

@ApiExcludeController()
@Controller()
export class SystemStatusController {
  constructor(private readonly activity: RequestActivityService) {}

  @Get(['monitoring/requests', 'diagnostics'])
  @Header('Cache-Control', 'no-store')
  diagnostics() {
    return this.activity.snapshot();
  }

  @Get(['monitoring/ping', 'diagnostics/ping'])
  @Header('Cache-Control', 'no-store')
  ping() {
    return { service: 'arogio-health-api', status: 'ok', timestamp: new Date().toISOString() };
  }
}
