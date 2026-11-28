import { Module } from '@nestjs/common';
import { AuthenticationModule } from '../authentication/authentication.module';
import { UserAccountsController } from './controllers/user-accounts.controller';
import { UserAccountsRepository } from './repositories/user-accounts.repository';
import { UserAccountsService } from './services/user-accounts.service';
import { ProfileController } from './controllers/profile.controller';

@Module({
  exports: [UserAccountsService],
  imports: [AuthenticationModule],
  controllers: [ProfileController, UserAccountsController],
  providers: [UserAccountsService, UserAccountsRepository],
})
export class UserAccountsModule {}
