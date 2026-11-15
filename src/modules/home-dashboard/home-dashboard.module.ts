import { Module } from '@nestjs/common';
import { AuthenticationModule } from '../authentication/authentication.module';
import { HomeDashboardController } from './controllers/home-dashboard.controller';
import { HomeDashboardService } from './services/home-dashboard.service';
import { StormglassWeather } from './integrations/stormglass.weather';
import { CareDirectoryModule } from '../care-directory/care-directory.module';
import { DiscoveryController } from './controllers/discovery.controller';
@Module({
  imports: [AuthenticationModule, CareDirectoryModule],
  controllers: [HomeDashboardController, DiscoveryController],
  providers: [HomeDashboardService, StormglassWeather],
})
export class HomeDashboardModule {}
