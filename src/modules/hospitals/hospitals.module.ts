import { Module } from '@nestjs/common';
import { AuthenticationModule } from '../authentication/authentication.module';
import { SuperAdministratorGuard } from '../administration/guards/administration.guard';
import { HospitalsService } from './services/hospitals.service';
import {
  HospitalsAdministrationController,
  PublicHospitalsController,
} from './controllers/hospitals.controller';

@Module({
  imports: [AuthenticationModule],
  controllers: [PublicHospitalsController, HospitalsAdministrationController],
  providers: [HospitalsService, SuperAdministratorGuard],
  exports: [HospitalsService],
})
export class HospitalsModule {}
