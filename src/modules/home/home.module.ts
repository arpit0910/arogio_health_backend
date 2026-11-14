import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { HomeController } from './home.controller';
import { HomeService } from './home.service';
import { StormglassWeather } from './stormglass.weather';
import { CareModule } from '../care/care.module';
import { DiscoveryController } from './discovery.controller';
@Module({
  imports: [AuthModule, CareModule],
  controllers: [HomeController, DiscoveryController],
  providers: [HomeService, StormglassWeather],
})
export class HomeModule {}
