import { Module } from '@nestjs/common';
import { RequestActivityService } from './services/request-activity.service';
import { SystemStatusController } from './controllers/system-status.controller';

@Module({
  controllers: [SystemStatusController],
  providers: [RequestActivityService],
  exports: [RequestActivityService],
})
export class SystemStatusModule {}
