import { Module } from '@nestjs/common';
import { SystemHealthController } from './controllers/system-health.controller';
import { SystemHealthService } from './services/system-health.service';

@Module({
  controllers: [SystemHealthController],
  providers: [SystemHealthService],
})
export class SystemHealthModule {}
