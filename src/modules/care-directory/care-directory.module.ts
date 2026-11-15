import { Module } from '@nestjs/common';
import { AuthenticationModule } from '../authentication/authentication.module';
import { HealthResourcesModule } from '../health-resources/health-resources.module';
import { SuperAdministratorGuard } from '../administration/guards/administration.guard';
import { CareDirectoryService } from './services/care-directory.service';
import { CareDirectoryController, CareDirectoryAdministrationController, CareDirectorySearchController } from './controllers/care-directory.controller';
@Module({
  imports: [AuthenticationModule, HealthResourcesModule],
  controllers: [CareDirectoryController, CareDirectoryAdministrationController, CareDirectorySearchController],
  providers: [CareDirectoryService, SuperAdministratorGuard],
  exports: [CareDirectoryService],
})
export class CareDirectoryModule {}
