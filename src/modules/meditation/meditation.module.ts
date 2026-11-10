import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MeditationController, PublicMeditationController } from './meditation.controller';
import { MeditationService } from './meditation.service';
@Module({
  imports: [AuthModule],
  controllers: [MeditationController, PublicMeditationController],
  providers: [MeditationService],
  exports: [MeditationService],
})
export class MeditationModule {}
