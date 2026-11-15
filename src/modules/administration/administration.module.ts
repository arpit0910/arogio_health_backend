import { HealthResourcesModule } from '../health-resources/health-resources.module';
import { MeditationLibraryModule } from '../meditation-library/meditation-library.module';
import { MeditationLibraryAdministrationController } from './controllers/meditation-library-administration.controller';
import { HealthResourcesAdministrationController } from './controllers/health-resources-administration.controller';
import { Module } from '@nestjs/common';
import { AuthenticationModule } from '../authentication/authentication.module';
import { UserAccountsModule } from '../user-accounts/user-accounts.module';
import { PersonalWellnessModule } from '../personal-wellness/personal-wellness.module';
import { PasswordHashingService } from '../authentication/services/password-hashing.service';
import { AdministrationController } from './controllers/administration.controller';
import { SuperAdministratorGuard } from './guards/administration.guard';
import { AdministrationService } from './services/administration.service';
import { DatabaseResetService } from './services/database-reset.service';
import { DatabaseResetController } from './controllers/database-reset.controller';
@Module({
  imports: [
    MeditationLibraryModule,
    HealthResourcesModule,
    AuthenticationModule,
    UserAccountsModule,
    PersonalWellnessModule,
  ],
  controllers: [
    AdministrationController,
    HealthResourcesAdministrationController,
    MeditationLibraryAdministrationController,
    DatabaseResetController,
  ],
  providers: [
    SuperAdministratorGuard,
    AdministrationService,
    PasswordHashingService,
    DatabaseResetService,
  ],
})
export class AdministrationModule {}
