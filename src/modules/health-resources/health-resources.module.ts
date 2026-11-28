import { Module } from '@nestjs/common';
import { AuthenticationModule } from '../authentication/authentication.module';
import { HealthResourcesController } from './controllers/health-resources.controller';
import { PublicHealthResourcesController } from './controllers/public-directory.controller';
import { HealthResourcesService } from './services/health-resources.service';
@Module({
  imports: [AuthenticationModule],
  controllers: [HealthResourcesController, PublicHealthResourcesController],
  providers: [HealthResourcesService],
  exports: [HealthResourcesService],
})
export class HealthResourcesModule {}
