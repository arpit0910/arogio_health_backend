import { Module } from '@nestjs/common';
import { AuthenticationModule } from '../authentication/authentication.module';
import { MeditationLibraryController, PublicMeditationLibraryController } from './controllers/meditation-library.controller';
import { PracticeHistoryService } from './services/practice-history.service';
import { MeditationLibraryService } from './services/meditation-library.service';
@Module({
  imports: [AuthenticationModule],
  controllers: [MeditationLibraryController, PublicMeditationLibraryController],
  providers: [MeditationLibraryService, PracticeHistoryService],
  exports: [MeditationLibraryService],
})
export class MeditationLibraryModule {}
