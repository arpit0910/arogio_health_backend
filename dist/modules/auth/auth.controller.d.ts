import { AuthService } from './auth.service';
import { GoogleLoginDto, LoginDto, RefreshTokenDto, RegisterDto } from './dto/auth.dto';
import { AuthResponseDto, TokenPairDto } from './dto/auth-response.dto';
export declare class AuthController {
    private readonly auth;
    constructor(auth: AuthService);
    register(input: RegisterDto): Promise<AuthResponseDto>;
    login(input: LoginDto): Promise<AuthResponseDto>;
    google(input: GoogleLoginDto): Promise<AuthResponseDto>;
    refresh(input: RefreshTokenDto): Promise<TokenPairDto>;
    logout(input: RefreshTokenDto): Promise<void>;
}
