import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { WellnessController } from './wellness.controller';
import { WellnessService } from './wellness.service';
import { ExportController } from './export.controller';
import { UsersModule } from '../users/users.module';
@Module({
  exports: [WellnessService],
  imports: [AuthModule, UsersModule],
  controllers: [WellnessController, ExportController],
  providers: [WellnessService],
})
export class WellnessModule {}
