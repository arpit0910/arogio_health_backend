import { Module } from '@nestjs/common';
import { AuthenticationModule } from '../authentication/authentication.module';
import { JeevaAssistantController } from './controllers/jeeva-assistant.controller';
import { JeevaAssistantService } from './services/jeeva-assistant.service';
import { JeevaHealthContextService } from './services/jeeva-health-context.service';
@Module({
  imports: [AuthenticationModule],
  controllers: [JeevaAssistantController],
  providers: [JeevaAssistantService, JeevaHealthContextService],
})
export class JeevaAssistantModule {}
