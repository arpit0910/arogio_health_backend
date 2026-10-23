import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import type { RequestUser } from '../../common/auth/request-user';
import { SafeUserDto } from '../auth/dto/auth-response.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get the current user profile' })
  @ApiOkResponse({ type: SafeUserDto })
  getMe(@CurrentUser() currentUser: RequestUser): Promise<SafeUserDto> {
    return this.users.getMe(currentUser.userId);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update permitted current-user profile fields' })
  @ApiOkResponse({ type: SafeUserDto })
  updateMe(
    @CurrentUser() currentUser: RequestUser,
    @Body() input: UpdateProfileDto,
  ): Promise<SafeUserDto> {
    return this.users.updateMe(currentUser.userId, input);
  }
}
