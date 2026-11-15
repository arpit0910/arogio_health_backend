import { Module } from '@nestjs/common';
import { AuthenticationModule } from '../authentication/authentication.module';
import { PersonalWellnessController } from './controllers/personal-wellness.controller';
import { PersonalWellnessService } from './services/personal-wellness.service';
import { ExportController } from './controllers/export.controller';
import { UserAccountsModule } from '../user-accounts/user-accounts.module';
@Module({
  exports: [PersonalWellnessService],
  imports: [AuthenticationModule, UserAccountsModule],
  controllers: [PersonalWellnessController, ExportController],
  providers: [PersonalWellnessService],
})
export class PersonalWellnessModule {}
