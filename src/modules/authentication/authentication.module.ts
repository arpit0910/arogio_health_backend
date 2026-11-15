import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtAuthGuard } from '../../common/authentication/jwt-auth.guard';
import {
  GoogleTokenVerifier,
  GoogleTokenVerifierService,
} from '../../infrastructure/google/google-token-verifier.service';
import { AuthenticationController } from './controllers/authentication.controller';
import { AuthenticationRepository } from './repositories/authentication.repository';
import { AuthenticationService } from './services/authentication.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { PasswordHashingService } from './services/password-hashing.service';

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
  controllers: [AuthenticationController],
  providers: [
    AuthenticationService,
    AuthenticationRepository,
    PasswordHashingService,
    JwtStrategy,
    JwtAuthGuard,
    { provide: GoogleTokenVerifier, useClass: GoogleTokenVerifierService },
  ],
  exports: [JwtAuthGuard],
})
export class AuthenticationModule {}
