import { Module } from '@nestjs/common';
import { AuthenticationModule } from '../authentication/authentication.module';
import { MeditationLibraryController, PublicMeditationLibraryController } from './controllers/meditation-library.controller';
import { MeditationLibraryService } from './services/meditation-library.service';
@Module({
  imports: [AuthenticationModule],
  controllers: [MeditationLibraryController, PublicMeditationLibraryController],
  providers: [MeditationLibraryService],
  exports: [MeditationLibraryService],
})
export class MeditationLibraryModule {}
