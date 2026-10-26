export declare class RegisterDto {
    email: string;
    password: string;
    fullName?: string;
    heightValue?: number;
    heightUnit?: 'cm' | 'in';
    weightValue?: number;
    weightUnit?: 'kg' | 'lb';
}
export declare class LoginDto {
    email: string;
    password: string;
}
export declare class GoogleLoginDto {
    idToken: string;
}
export declare class RefreshTokenDto {
    refreshToken: string;
}
