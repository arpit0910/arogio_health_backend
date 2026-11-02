import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiExcludeController,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import type { RequestUser } from '../../common/auth/request-user';
import { SafeUserDto } from '../auth/dto/auth-response.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ProfileSetupDto } from './dto/profile-setup.dto';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiExcludeController()
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
  @Patch(['me/profile-setup', 'me/setup'])
  @ApiOperation({ summary: 'Save profile setup progress or complete setup' })
  @ApiOkResponse({ type: SafeUserDto })
  saveSetup(
    @CurrentUser() currentUser: RequestUser,
    @Body() input: ProfileSetupDto,
  ): Promise<SafeUserDto> {
    return this.users.saveSetup(currentUser.userId, input);
  }
}
