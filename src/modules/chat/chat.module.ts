import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ChatContextService } from './chat-context.service';
@Module({
  imports: [AuthModule],
  controllers: [ChatController],
  providers: [ChatService, ChatContextService],
})
export class ChatModule {}
