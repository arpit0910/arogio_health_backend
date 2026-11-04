import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MeditationController } from './meditation.controller';
import { MeditationService } from './meditation.service';
@Module({
  imports: [AuthModule],
  controllers: [MeditationController],
  providers: [MeditationService],
  exports: [MeditationService],
})
export class MeditationModule {}
