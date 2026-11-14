import { DeleteAccountDto } from './dto/delete-account.dto';
import { ApplyReferralDto } from './dto/referral.dto';
import { Body, Controller, Delete, Get, Patch, Post, UseGuards } from '@nestjs/common';
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

  @Post('referral')
  @ApiOperation({ summary: 'Record a referrer once, before completing account setup' })
  @ApiOkResponse({ type: SafeUserDto })
  applyReferral(
    @CurrentUser() user: RequestUser,
    @Body() input: ApplyReferralDto,
  ): Promise<SafeUserDto> {
    return this.profiles.applyReferral(user.userId, input.referralCode);
  }

  @Delete()
  @ApiOperation({
    summary: 'Soft-delete your account; verified sign-in within 30 days restores it',
  })
  deleteAccount(@CurrentUser() user: RequestUser, @Body() input: DeleteAccountDto) {
    return this.profiles.deleteAccount(user.userId, input.confirm);
  }

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
