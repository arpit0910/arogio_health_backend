import { Module } from '@nestjs/common';
import { AuthenticationModule } from '../authentication/authentication.module';
import { SuperAdministratorGuard } from '../administration/guards/administration.guard';
import { DoctorsService } from './services/doctors.service';
import {
  DoctorsAdministrationController,
  PublicDoctorsController,
} from './controllers/doctors.controller';

@Module({
  imports: [AuthenticationModule],
  controllers: [PublicDoctorsController, DoctorsAdministrationController],
  providers: [DoctorsService, SuperAdministratorGuard],
  exports: [DoctorsService],
})
export class DoctorsModule {}
