import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DirectoryController } from './directory.controller';
import { PublicDirectoryController } from './public-directory.controller';
import { DirectoryService } from './directory.service';
@Module({
  imports: [AuthModule],
  controllers: [DirectoryController, PublicDirectoryController],
  providers: [DirectoryService],
  exports: [DirectoryService],
})
export class DirectoryModule {}
