import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { GoogleTokenVerifier } from '../../infrastructure/google/google-token-verifier.service';
import { AuthRepository } from './auth.repository';
import type { GoogleLoginDto, LoginDto, RefreshTokenDto, RegisterDto } from './dto/auth.dto';
import { type AuthResponseDto, type TokenPairDto } from './dto/auth-response.dto';
import { PasswordService } from './password.service';
export declare class AuthService {
    private readonly repository;
    private readonly passwords;
    private readonly google;
    private readonly jwt;
    private readonly accessTtl;
    private readonly refreshTtlMs;
    constructor(repository: AuthRepository, passwords: PasswordService, google: GoogleTokenVerifier, jwt: JwtService, config: ConfigService);
    register(input: RegisterDto): Promise<AuthResponseDto>;
    login(input: LoginDto): Promise<AuthResponseDto>;
    googleLogin(input: GoogleLoginDto): Promise<AuthResponseDto>;
    refresh(input: RefreshTokenDto): Promise<TokenPairDto>;
    logout(input: RefreshTokenDto): Promise<void>;
    private createLoginSession;
    private buildTokenPair;
}
