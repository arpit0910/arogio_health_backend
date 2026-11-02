import { Module } from '@nestjs/common';
import { RequestActivityService } from './request-activity.service';
import { StatusController } from './status.controller';

@Module({
  controllers: [StatusController],
  providers: [RequestActivityService],
  exports: [RequestActivityService],
})
export class StatusModule {}
