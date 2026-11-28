import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/authentication/jwt-auth.guard';
import { CurrentUser } from '../../../common/authentication/current-user.decorator';
import type { RequestUser } from '../../../common/authentication/request-user';
import { SuperAdministratorGuard } from '../guards/administration.guard';
import { DatabaseResetService } from '../services/database-reset.service';

@Controller('admin/database-reset')
@UseGuards(JwtAuthGuard, SuperAdministratorGuard)
export class DatabaseResetController {
  constructor(private readonly service: DatabaseResetService) {}
  @Post('preview') preview(@CurrentUser() user: RequestUser, @Body() body: unknown) {
    return this.service.preview(user.userId, body);
  }
  @Post('apply') apply(@CurrentUser() user: RequestUser, @Body() body: unknown) {
    return this.service.apply(user.userId, body);
  }
}
