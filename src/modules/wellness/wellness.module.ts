import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { WellnessController } from './wellness.controller';
import { WellnessService } from './wellness.service';
@Module({
  exports: [WellnessService],
  imports: [AuthModule],
  controllers: [WellnessController],
  providers: [WellnessService],
})
export class WellnessModule {}
