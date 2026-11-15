import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AuthenticationService } from '../services/authentication.service';
import { GoogleLoginDto, LoginDto, RefreshTokenDto, RegisterDto } from '../requests/authentication.dto';
import { AuthResponseDto, TokenPairDto } from '../responses/authentication-response.dto';

@ApiTags('authentication')
@Controller('auth')
export class AuthenticationController {
  constructor(private readonly auth: AuthenticationService) {}

  @Post(['email/register', 'register'])
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Register with email and password' })
  @ApiCreatedResponse({ type: AuthResponseDto })
  register(@Body() input: RegisterDto): Promise<AuthResponseDto> {
    return this.auth.register(input);
  }

  @Post(['email/login', 'login'])
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Sign in with email and password' })
  @ApiOkResponse({ type: AuthResponseDto })
  login(@Body() input: LoginDto): Promise<AuthResponseDto> {
    return this.auth.login(input);
  }

  @Post(['google/login', 'google'])
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Sign in or register with a Google ID token' })
  @ApiOkResponse({ type: AuthResponseDto })
  google(@Body() input: GoogleLoginDto): Promise<AuthResponseDto> {
    return this.auth.googleLogin(input);
  }

  @Post(['tokens/refresh', 'refresh'])
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOperation({ summary: 'Rotate a refresh token' })
  @ApiOkResponse({ type: TokenPairDto })
  refresh(@Body() input: RefreshTokenDto): Promise<TokenPairDto> {
    return this.auth.refresh(input);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke the current refresh session' })
  @ApiNoContentResponse()
  logout(@Body() input: RefreshTokenDto): Promise<void> {
    return this.auth.logout(input);
  }
}
