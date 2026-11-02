import { HttpStatus, Injectable } from '@nestjs/common';
import { ApiError } from '../../common/errors/api-error';
import { DatabaseService } from '../../database/database.service';

@Injectable()
export class HealthService {
  constructor(private readonly database: DatabaseService) {}

  liveness(): { status: 'ok'; timestamp: string } {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  async readiness(): Promise<{ status: 'ready'; checks: { database: 'up' }; timestamp: string }> {
    try {
      await this.database.ping();
    } catch {
      throw new ApiError(
        'SERVICE_NOT_READY',
        'A required dependency is unavailable',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
    return {
      status: 'ready',
      checks: { database: 'up' },
      timestamp: new Date().toISOString(),
    };
  }
}
