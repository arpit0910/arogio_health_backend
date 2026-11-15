import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { GoogleTokenVerifier } from '../../../infrastructure/google/google-token-verifier.service';
import { AuthenticationRepository } from '../repositories/authentication.repository';
import type { GoogleLoginDto, LoginDto, RefreshTokenDto, RegisterDto } from '../requests/authentication.dto';
import { type AuthResponseDto, type TokenPairDto } from '../responses/authentication-response.dto';
import { PasswordHashingService } from './password-hashing.service';
export declare class AuthenticationService {
    private readonly repository;
    private readonly passwords;
    private readonly google;
    private readonly jwt;
    private readonly accessTtl;
    private readonly refreshTtlMs;
    constructor(repository: AuthenticationRepository, passwords: PasswordHashingService, google: GoogleTokenVerifier, jwt: JwtService, config: ConfigService);
    register(input: RegisterDto): Promise<AuthResponseDto>;
    login(input: LoginDto): Promise<AuthResponseDto>;
    googleLogin(input: GoogleLoginDto): Promise<AuthResponseDto>;
    private recoverForLogin;
    refresh(input: RefreshTokenDto): Promise<TokenPairDto>;
    logout(input: RefreshTokenDto): Promise<void>;
    private createLoginSession;
    private buildTokenPair;
}
