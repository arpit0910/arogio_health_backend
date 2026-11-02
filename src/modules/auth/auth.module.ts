import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import {
  GoogleTokenVerifier,
  GoogleTokenVerifierService,
} from '../../infrastructure/google/google-token-verifier.service';
import { AuthController } from './auth.controller';
import { AuthRepository } from './auth.repository';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { PasswordService } from './password.service';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        signOptions: {
          issuer: config.getOrThrow<string>('JWT_ISSUER'),
          audience: config.getOrThrow<string>('JWT_AUDIENCE'),
          expiresIn: config.getOrThrow<number>('JWT_ACCESS_TTL_SECONDS'),
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthRepository,
    PasswordService,
    JwtStrategy,
    JwtAuthGuard,
    { provide: GoogleTokenVerifier, useClass: GoogleTokenVerifierService },
  ],
  exports: [JwtAuthGuard],
})
export class AuthModule {}
