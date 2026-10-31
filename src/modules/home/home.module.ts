import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { HomeController } from './home.controller';
import { HomeService } from './home.service';
import { StormglassWeather } from './stormglass.weather';
@Module({ imports: [AuthModule], controllers: [HomeController], providers: [HomeService, StormglassWeather] })
export class HomeModule {}
