import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { UsersController } from './users.controller';
import { UsersRepository } from './users.repository';
import { UsersService } from './users.service';
import { ProfileController } from './profile.controller';

@Module({
  imports: [AuthModule],
  controllers: [ProfileController, UsersController],
  providers: [UsersService, UsersRepository],
})
export class UsersModule {}
