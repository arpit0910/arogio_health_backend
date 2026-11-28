import { Module } from '@nestjs/common';
import { AuthenticationModule } from '../authentication/authentication.module';
import { SuperAdministratorGuard } from '../administration/guards/administration.guard';
import { MedicalDepartmentsService } from './services/medical-departments.service';
import {
  MedicalDepartmentsAdministrationController,
  PublicMedicalDepartmentsController,
} from './controllers/medical-departments.controller';

@Module({
  imports: [AuthenticationModule],
  controllers: [PublicMedicalDepartmentsController, MedicalDepartmentsAdministrationController],
  providers: [MedicalDepartmentsService, SuperAdministratorGuard],
  exports: [MedicalDepartmentsService],
})
export class MedicalDepartmentsModule {}
