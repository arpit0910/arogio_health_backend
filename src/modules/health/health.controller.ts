import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { HealthService } from './health.service';

@ApiTags('health')
@Controller()
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Get(['health/liveness', 'health'])
  @ApiOperation({ summary: 'Process liveness check' })
  @ApiOkResponse({ description: 'The API process is alive' })
  healthCheck(): { status: 'ok'; timestamp: string } {
    return this.health.liveness();
  }

  @Get(['health/readiness', 'ready'])
  @ApiOperation({ summary: 'Dependency readiness check' })
  @ApiOkResponse({ description: 'The API and required dependencies are ready' })
  readinessCheck(): Promise<{ status: 'ready'; checks: { database: 'up' }; timestamp: string }> {
    return this.health.readiness();
  }
}
