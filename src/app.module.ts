import { DiseasesModule } from './modules/diseases/diseases.module';
import { DoctorsModule } from './modules/doctors/doctors.module';
import { HospitalsModule } from './modules/hospitals/hospitals.module';
import { HealthResourcesModule } from './modules/health-resources/health-resources.module';
import { MedicalDepartmentsModule } from './modules/medical-departments/medical-departments.module';
import { CareDirectoryModule } from './modules/care-directory/care-directory.module';
import { MeditationLibraryModule } from './modules/meditation-library/meditation-library.module';
import { AdministrationModule } from './modules/administration/administration.module';
import { HomeDashboardModule } from './modules/home-dashboard/home-dashboard.module';
import { JeevaAssistantModule } from './modules/jeeva-assistant/jeeva-assistant.module';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { createLoggerConfig } from './common/logging/logger.config';
import { validateEnvironment } from './configuration/environment.schema';
import { DatabaseModule } from './database/database.module';
import { SystemHealthModule } from './modules/system-health/system-health.module';
import { AuthenticationModule } from './modules/authentication/authentication.module';
import { UserAccountsModule } from './modules/user-accounts/user-accounts.module';
import { SystemStatusModule } from './modules/system-status/system-status.module';
import { PersonalWellnessModule } from './modules/personal-wellness/personal-wellness.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath:
        process.env.NODE_ENV === 'production'
          ? ['.env.production', '.env']
          : ['.env.local', '.env'],
      validate: validateEnvironment,
    }),
    LoggerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: createLoggerConfig,
    }),
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 120 }]),
    DatabaseModule,
    MedicalDepartmentsModule,
    HospitalsModule,
    DoctorsModule,
    DiseasesModule,
    AdministrationModule,
    MeditationLibraryModule,
    HealthResourcesModule,
    CareDirectoryModule,
    HomeDashboardModule,
    JeevaAssistantModule,
    SystemHealthModule,
    SystemStatusModule,
    AuthenticationModule,
    UserAccountsModule,
    PersonalWellnessModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
