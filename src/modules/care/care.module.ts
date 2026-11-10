import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DirectoryModule } from '../directory/directory.module';
import { SuperAdminGuard } from '../admin/admin.guard';
import { CareService } from './care.service';
import { CareController, CareAdminController, CareSearchController } from './care.controller';
@Module({
  imports: [AuthModule, DirectoryModule],
  controllers: [CareController, CareAdminController, CareSearchController],
  providers: [CareService, SuperAdminGuard],
})
export class CareModule {}
