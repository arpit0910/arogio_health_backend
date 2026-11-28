import { AuthenticationService } from '../services/authentication.service';
import { GoogleLoginDto, LoginDto, RefreshTokenDto, RegisterDto } from '../requests/authentication.dto';
import { AuthResponseDto, TokenPairDto } from '../responses/authentication-response.dto';
export declare class AuthenticationController {
    private readonly auth;
    constructor(auth: AuthenticationService);
    register(input: RegisterDto): Promise<AuthResponseDto>;
    login(input: LoginDto): Promise<AuthResponseDto>;
    google(input: GoogleLoginDto): Promise<AuthResponseDto>;
    refresh(input: RefreshTokenDto): Promise<TokenPairDto>;
    logout(input: RefreshTokenDto): Promise<void>;
}
