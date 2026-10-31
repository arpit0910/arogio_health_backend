import { DirectoryModule } from '../directory/directory.module';
import { DirectoryAdminController } from './directory-admin.controller';
import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { WellnessModule } from '../wellness/wellness.module';
import { PasswordService } from '../auth/password.service';
import { AdminController } from './admin.controller';
import { SuperAdminGuard } from './admin.guard';
import { AdminService } from './admin.service';
@Module({
  imports: [DirectoryModule, AuthModule, UsersModule, WellnessModule],
  controllers: [AdminController, DirectoryAdminController],
  providers: [SuperAdminGuard, AdminService, PasswordService],
})
export class AdminModule {}
