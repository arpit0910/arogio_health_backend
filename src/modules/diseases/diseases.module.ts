import { Module } from '@nestjs/common';
import { AuthenticationModule } from '../authentication/authentication.module';
import { SuperAdministratorGuard } from '../administration/guards/administration.guard';
import { DiseasesService } from './services/diseases.service';
import {
  DiseasesAdministrationController,
  PublicDiseasesController,
} from './controllers/diseases.controller';

@Module({
  imports: [AuthenticationModule],
  controllers: [PublicDiseasesController, DiseasesAdministrationController],
  providers: [DiseasesService, SuperAdministratorGuard],
  exports: [DiseasesService],
})
export class DiseasesModule {}
