import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import type { RequestUser } from '../../common/auth/request-user';
import { SafeUserDto } from '../auth/dto/auth-response.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UsersService } from './users.service';

@ApiTags('profile')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('profile')
export class ProfileController {
  constructor(private readonly profiles: UsersService) {}

  @Get('view')
  @ApiOperation({ summary: 'View your profile' })
  @ApiOkResponse({ type: SafeUserDto })
  view(@CurrentUser() user: RequestUser): Promise<SafeUserDto> {
    return this.profiles.getMe(user.userId);
  }

  @Post('create')
  @ApiOperation({ summary: 'Create your profile; retries return the existing profile' })
  @ApiCreatedResponse({ type: SafeUserDto })
  create(@CurrentUser() user: RequestUser, @Body() input: UpdateProfileDto): Promise<SafeUserDto> {
    return this.profiles.createProfile(user.userId, input);
  }

  @Patch('update')
  @ApiOperation({ summary: 'Update personal details, preferences or setup progress' })
  @ApiOkResponse({ type: SafeUserDto })
  update(@CurrentUser() user: RequestUser, @Body() input: UpdateProfileDto): Promise<SafeUserDto> {
    return this.profiles.updateMe(user.userId, input);
  }
}
